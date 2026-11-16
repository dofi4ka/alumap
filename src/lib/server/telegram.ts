import crypto from 'node:crypto';
import { Bot, InlineKeyboard, Keyboard } from 'grammy';
import { and, eq, gt } from 'drizzle-orm';
import { db, telegramLinkTokens, users } from './db/index.ts';
import { env } from './env.ts';
import { randomToken } from './auth.ts';
import { nearestCity } from './cities.ts';
import { formatDay } from '#lib/format.ts';
import { parseDuration, type City } from './geo.ts';
import { setTemporaryLocation } from './locations.ts';
import { botGlobal, getBotUsername, sendTelegramMessage } from './telegram-send.ts';

export { getBotUsername, sendTelegramMessage };

/** Geolocations waiting for the user to answer "how long?", per Telegram id. */
const pendingLocations = new Map<number, { city: City; expiresAt: number }>();
const PENDING_TTL = 15 * 60 * 1000;

// plain text, so the user's name needs no escaping
const greeting = (name: string) => `👋 Hello, ${name}
🎓 Welcome to IU Alumap — we're glad to have you here!
🔔 You will receive your app notifications through this bot

📍 Travelling? Send /away and your location to set a temporary city. Keep alumnis aware!

📞 Found a bug? Or have a suggestion? Contact @dofi4ka
👥 Questions about community? Ask @Leisan_I, @aliyarashk`;

const durationHelp =
	'How long will you be here?\nReply with a duration like 14d, 3w or 2m, or pick one below:';

const durationKeyboard = () =>
	new InlineKeyboard()
		.text('1 day', 'temp:1d')
		.text('3 days', 'temp:3d')
		.row()
		.text('1 week', 'temp:1w')
		.text('2 weeks', 'temp:2w')
		.row()
		.text('1 month', 'temp:1m')
		.text('3 months', 'temp:3m');

const userByTelegramId = async (telegramId: number) =>
	(await db.select().from(users).where(eq(users.telegramId, telegramId)))[0] ?? null;

export function startBot() {
	if (!env.botToken) {
		console.log('[telegram] BOT_TOKEN is not set, bot is disabled');
		return;
	}
	// avoid starting a second poller on dev-server reloads
	if (botGlobal.__alumapBot) return;

	const bot = new Bot(env.botToken);
	botGlobal.__alumapBot = bot;

	// telegram accepts only https links for miniapps
	const openKeyboard = () =>
		env.miniappUrl.startsWith('https://')
			? new InlineKeyboard().webApp('🌍 Open Alumap', env.miniappUrl)
			: undefined;

	// Keep the displayed username current whenever the user interacts with the bot.
	bot.use(async (ctx, next) => {
		try {
			const from = ctx.from;
			if (from && !from.is_bot && ctx.chat?.type === 'private') {
				const row = (
					await db
						.select({ id: users.id, telegramUsername: users.telegramUsername })
						.from(users)
						.where(eq(users.telegramId, from.id))
				)[0];
				const username = from.username ?? null;
				if (row && row.telegramUsername !== username)
					await db.update(users).set({ telegramUsername: username }).where(eq(users.id, row.id));
			}
		} catch (err) {
			console.error('[telegram] username sync failed', err);
		}
		await next();
	});

	bot.command('start', async (ctx) => {
		const payload = ctx.match?.trim();
		if (payload?.startsWith('link_')) {
			const message = await linkAccount(payload.slice(5), ctx.from!.id, ctx.from!.username);
			await ctx.reply(message, { reply_markup: openKeyboard() });
			return;
		}
		await ctx.reply(greeting(ctx.from?.first_name ?? 'there'), { reply_markup: openKeyboard() });
	});

	bot.command('away', async (ctx) => {
		const from = ctx.from;
		if (!from) return;
		const user = await userByTelegramId(from.id);
		if (!user) {
			await ctx.reply(
				'Connect Telegram to your Alumap account first: open your profile, press "Connect Telegram", then try again.'
			);
			return;
		}
		await ctx.reply(
			'📍 Send me your current location and I will find the nearest city.',
			{
				reply_markup: new Keyboard()
					.requestLocation('📡 Send my location')
					.resized()
					.oneTime()
			}
		);
	});

	bot.on('message:location', async (ctx) => {
		const from = ctx.from;
		if (!from) return;
		const user = await userByTelegramId(from.id);
		if (!user) {
			await ctx.reply(
				'Connect Telegram to your Alumap account first: open your profile, press "Connect Telegram", then try again.'
			);
			return;
		}
		const { latitude, longitude } = ctx.message.location;
		const city = nearestCity(latitude, longitude);
		pendingLocations.set(from.id, { city, expiresAt: Date.now() + PENDING_TTL });
		await ctx.reply(
			`📍 You are near ${city.name}, ${city.country}.\n\n${durationHelp}`,
			{ reply_markup: durationKeyboard() }
		);
	});

	bot.callbackQuery(/^temp:(.+)$/, async (ctx) => {
		await ctx.answerCallbackQuery();
		await applyTemporaryCity(ctx, ctx.match[1]);
	});

	// A plain text duration is accepted while the bot waits for one.
	bot.on('message:text', async (ctx) => {
		const from = ctx.from;
		if (!from) return;
		const pending = pendingLocations.get(from.id);
		if (!pending) return;
		if (pending.expiresAt < Date.now()) {
			pendingLocations.delete(from.id);
			await ctx.reply('That took too long. Send /away to start again.');
			return;
		}
		if (!parseDuration(ctx.message.text)) {
			await ctx.reply(`I did not get that. ${durationHelp}`);
			return;
		}
		await applyTemporaryCity(ctx, ctx.message.text);
	});

	bot.catch((err) => console.error('[telegram]', err));

	bot.init()
		.then(async () => {
			if (env.miniappUrl.startsWith('https://')) {
				await bot.api.setChatMenuButton({
					menu_button: { type: 'web_app', text: 'Alumap', web_app: { url: env.miniappUrl } }
				});
			}
			await bot.api
				.setMyCommands([
					{ command: 'start', description: 'Open Alumap' },
					{ command: 'away', description: 'Set a temporary city' }
				])
				.catch((err) => console.error('[telegram] setMyCommands failed', err));
			void bot.start({ drop_pending_updates: true });
			console.log(`[telegram] bot @${bot.botInfo.username} started`);
		})
		.catch((err) => console.error('[telegram] failed to start bot', err));

	async function applyTemporaryCity(
		ctx: {
			from: { id: number };
			reply: (text: string, other?: Record<string, unknown>) => Promise<unknown>;
		},
		duration: string
	) {
		const pending = pendingLocations.get(ctx.from.id);
		if (!pending || pending.expiresAt < Date.now()) {
			pendingLocations.delete(ctx.from.id);
			await ctx.reply('Send /away and your location first.');
			return;
		}
		const user = await userByTelegramId(ctx.from.id);
		if (!user) {
			await ctx.reply('This Telegram is not connected to Alumap.');
			return;
		}
		const result = await setTemporaryLocation(user.id, pending.city, duration);
		if (!result.ok) {
			await ctx.reply(`${result.error}.\n\n${durationHelp}`);
			return;
		}
		pendingLocations.delete(ctx.from.id);
		await ctx.reply(
			`✅ You are now in ${pending.city.name} until ${formatDay(result.expiresAt)}.\n` +
				'Your profile and the map show this city, then your home city comes back automatically.',
			{ reply_markup: { remove_keyboard: true } }
		);
	}
}

export async function createLinkToken(userId: number) {
	const token = randomToken();
	await db
		.insert(telegramLinkTokens)
		.values({ token, userId, expiresAt: new Date(Date.now() + 15 * 60 * 1000) });
	return `link_${token}`;
}

export async function sendTelegramCode(telegramId: number, code: string) {
	return sendTelegramMessage(
		telegramId,
		`🔐 Your Alumap verification code: ${code}\n\nIt is valid for 15 minutes. If it wasn't you, ignore this message.`
	);
}

async function linkAccount(token: string, telegramId: number, username: string | undefined) {
	const row = (
		await db
			.select()
			.from(telegramLinkTokens)
			.where(and(eq(telegramLinkTokens.token, token), gt(telegramLinkTokens.expiresAt, new Date())))
	)[0];
	if (!row) return 'This link has expired. Press "Connect Telegram" in your Alumap profile again.';

	await db.transaction(async (tx) => {
		await tx.delete(telegramLinkTokens).where(eq(telegramLinkTokens.userId, row.userId));
		// a telegram account may be linked to one user only
		await tx.update(users).set({ telegramId: null, telegramUsername: null }).where(eq(users.telegramId, telegramId));
		await tx
			.update(users)
			.set({ telegramId, telegramUsername: username ?? null })
			.where(eq(users.id, row.userId));
	});
	return '✅ Telegram is connected to your Alumap account. Now the miniapp will log you in automatically and you will get notifications here.';
}

/** Validates Telegram.WebApp.initData, returns telegram user id. */
export function validateInitData(initData: string): number | null {
	if (!env.botToken) return null;
	const params = new URLSearchParams(initData);
	const hash = params.get('hash');
	if (!hash) return null;
	params.delete('hash');

	const dataCheckString = [...params.entries()]
		.sort(([a], [b]) => a.localeCompare(b))
		.map(([k, v]) => `${k}=${v}`)
		.join('\n');
	const secret = crypto.createHmac('sha256', 'WebAppData').update(env.botToken).digest();
	const expected = crypto.createHmac('sha256', secret).update(dataCheckString).digest('hex');
	if (
		expected.length !== hash.length ||
		!crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(hash))
	)
		return null;

	const authDate = Number(params.get('auth_date'));
	if (!authDate || Date.now() / 1000 - authDate > 24 * 3600) return null;

	try {
		return JSON.parse(params.get('user') ?? '').id ?? null;
	} catch {
		return null;
	}
}
