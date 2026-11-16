import type { Bot } from 'grammy';

/**
 * The bot instance is kept on globalThis: dev-server reloads re-run modules but keep the poller.
 * Split from telegram.ts so notification code can send messages without importing the whole bot.
 */
export const botGlobal = globalThis as { __alumapBot?: Bot };

export const runningBot = () => botGlobal.__alumapBot;

export const getBotUsername = () =>
	botGlobal.__alumapBot?.isInited() ? botGlobal.__alumapBot.botInfo.username : '';

/** Best-effort delivery; returns false when the bot is not running or Telegram rejected the message. */
export async function sendTelegramMessage(chatId: number, text: string): Promise<boolean> {
	const bot = runningBot();
	if (!bot?.isInited()) return false;
	try {
		await bot.api.sendMessage(chatId, text, { link_preview_options: { is_disabled: true } });
		return true;
	} catch (err) {
		console.error('[telegram] send failed', err);
		return false;
	}
}
