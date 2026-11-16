import { InlineKeyboard, type Bot } from 'grammy';

/**
 * The bot instance is kept on globalThis: dev-server reloads re-run modules but keep the poller.
 * Split from telegram.ts so notification code can send messages without importing the whole bot.
 */
export const botGlobal = globalThis as { __alumapBot?: Bot };

export const runningBot = () => botGlobal.__alumapBot;

export const getBotUsername = () =>
	botGlobal.__alumapBot?.isInited() ? botGlobal.__alumapBot.botInfo.username : '';

export type TelegramSendOptions = {
	/** Only HTML is used, so user-provided names and titles stay safe. */
	parseMode?: 'HTML';
	/** Inline button that opens a URL under the message. */
	inlineUrl?: { label: string; url: string };
};

/** Best-effort delivery; returns false when the bot is not running or Telegram rejected the message. */
export async function sendTelegramMessage(
	chatId: number,
	text: string,
	options: TelegramSendOptions = {}
): Promise<boolean> {
	const bot = runningBot();
	if (!bot?.isInited()) return false;
	try {
		await bot.api.sendMessage(chatId, text, {
			parse_mode: options.parseMode,
			link_preview_options: { is_disabled: true },
			reply_markup: options.inlineUrl
				? new InlineKeyboard().url(options.inlineUrl.label, options.inlineUrl.url)
				: undefined
		});
		return true;
	} catch (err) {
		console.error('[telegram] send failed', err);
		return false;
	}
}
