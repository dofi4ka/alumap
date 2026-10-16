import crypto from 'node:crypto';
import { Bot, InlineKeyboard } from 'grammy';
import { and, eq, gt } from 'drizzle-orm';
import { db, telegramLinkTokens, users } from './db/index.ts';
import { env } from './env.ts';
import { randomToken } from './auth.ts';

// kept on globalThis: dev-server reloads re-run this module, but the bot keeps running
const g = globalThis as { __alumapBot?: Bot };

export const getBotUsername = () => (g.__alumapBot?.isInited() ? g.__alumapBot.botInfo.username : '');

// plain text, so the user's name needs no escaping
const greeting = (name: string) => `👋 Hello, ${name}
🎓 Welcome to IU Alumap — we're glad to have you here!
🔔 You will receive your app notifications through this bot

📞 Found a bug? Or have a suggestion? Contact @dofi4ka`;

export function startBot() {
	if (!env.botToken) {
		console.log('[telegram] BOT_TOKEN is not set, bot is disabled');
		return;
	}
	// avoid starting a second poller on dev-server reloads
	if (g.__alumapBot) return;

	const bot = new Bot(env.botToken);
	g.__alumapBot = bot;

	// telegram accepts only https links for miniapps
	const openKeyboard = () =>
		env.miniappUrl.startsWith('https://')
			? new InlineKeyboard().webApp('🌍 Open Alumap', env.miniappUrl)
			: undefined;

	bot.command('start', async (ctx) => {
		const payload = ctx.match?.trim();
		if (payload?.startsWith('link_')) {
			const message = linkAccount(payload.slice(5), ctx.from!.id, ctx.from!.username);
			await ctx.reply(message, { reply_markup: openKeyboard() });
			return;
		}
		await ctx.reply(greeting(ctx.from?.first_name ?? 'there'), { reply_markup: openKeyboard() });
	});

	bot.catch((err) => console.error('[telegram]', err));

	bot.init()
		.then(async () => {
			if (env.miniappUrl.startsWith('https://')) {
				await bot.api.setChatMenuButton({
					menu_button: { type: 'web_app', text: 'Alumap', web_app: { url: env.miniappUrl } }
				});
			}
			void bot.start({ drop_pending_updates: true });
			console.log(`[telegram] bot @${bot.botInfo.username} started`);
		})
		.catch((err) => console.error('[telegram] failed to start bot', err));
}

export function createLinkToken(userId: number) {
	const token = randomToken();
	db.insert(telegramLinkTokens)
		.values({ token, userId, expiresAt: new Date(Date.now() + 15 * 60 * 1000) })
		.run();
	return `link_${token}`;
}

function linkAccount(token: string, telegramId: number, username: string | undefined) {
	const row = db
		.select()
		.from(telegramLinkTokens)
		.where(and(eq(telegramLinkTokens.token, token), gt(telegramLinkTokens.expiresAt, new Date())))
		.get();
	if (!row) return 'This link has expired. Press "Connect Telegram" in your Alumap profile again.';

	db.delete(telegramLinkTokens).where(eq(telegramLinkTokens.userId, row.userId)).run();
	// a telegram account may be linked to one user only
	db.update(users)
		.set({ telegramId: null })
		.where(eq(users.telegramId, telegramId))
		.run();
	db.update(users)
		.set({ telegramId, telegramUsername: username ?? null })
		.where(eq(users.id, row.userId))
		.run();
	return '✅ Telegram is connected to your Alumap account. Now the miniapp will log you in automatically.';
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
