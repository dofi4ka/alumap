import { error, json } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { createSession } from '#lib/server/auth.ts';
import { db, users } from '#lib/server/db/index.ts';
import { validateInitData } from '#lib/server/telegram.ts';
import type { RequestHandler } from './$types';

/** Automatic login inside Telegram miniapp for users with connected telegram. */
export const POST: RequestHandler = async ({ request, cookies }) => {
	const { initData } = await request.json();
	const telegramId = typeof initData === 'string' ? validateInitData(initData) : null;
	if (!telegramId) error(400, 'Invalid init data');

	const user = db.select().from(users).where(eq(users.telegramId, telegramId)).get();
	if (!user) return json({ ok: false });

	createSession(cookies, user.id);
	return json({ ok: true });
};
