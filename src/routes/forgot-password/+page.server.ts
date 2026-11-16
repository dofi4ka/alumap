import { fail, redirect } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';
import { createSession, hashPassword } from '#lib/server/auth.ts';
import { db, sessions, userCodes, users, type User } from '#lib/server/db/index.ts';
import { sendVerificationCode } from '#lib/server/email.ts';
import { str } from '#lib/server/forms.ts';
import { sendTelegramCode } from '#lib/server/telegram.ts';
import { issueUserCode, verifyUserCode } from '#lib/server/user-codes.ts';
import type { Actions } from './$types';

type Channel = 'email' | 'telegram';

const findUser = async (email: string) =>
	(await db.select().from(users).where(eq(users.email, email)))[0] ?? null;

async function sendResetCode(user: User): Promise<Channel> {
	const code = await issueUserCode({
		userId: user.id,
		purpose: 'password-reset',
		email: user.email
	});
	if (user.telegramId && (await sendTelegramCode(user.telegramId, code))) return 'telegram';
	await sendVerificationCode(user.email, code, 'password-reset');
	return 'email';
}

export const actions: Actions = {
	start: async ({ request }) => {
		const email = str(await request.formData(), 'email')?.toLowerCase() ?? '';
		if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))
			return fail(400, { email, error: 'Enter a valid email' });

		const user = await findUser(email);
		let channel: Channel = 'email';
		if (user) {
			try {
				channel = await sendResetCode(user);
			} catch (e) {
				console.error('[password reset]', e);
				return fail(400, { email, error: 'Could not send the code, try again later' });
			}
		}
		return { step: 'verify' as const, email, channel };
	},

	resend: async ({ request }) => {
		const email = str(await request.formData(), 'email')?.toLowerCase() ?? '';
		const user = await findUser(email);
		if (!user) return { step: 'verify' as const, email, channel: 'email' as const, resent: true };
		try {
			const channel = await sendResetCode(user);
			return { step: 'verify' as const, email, channel, resent: true };
		} catch (e) {
			console.error('[password reset]', e);
			return fail(400, {
				step: 'verify' as const,
				email,
				channel: 'email' as const,
				error: 'Could not send the code, try again later'
			});
		}
	},

	reset: async ({ request, cookies }) => {
		const fd = await request.formData();
		const email = str(fd, 'email')?.toLowerCase() ?? '';
		const channel: Channel = fd.get('channel') === 'telegram' ? 'telegram' : 'email';
		const password = (fd.get('password') as string | null) ?? '';
		const err = (error: string) =>
			fail(400, {
				step: 'verify' as const,
				email,
				channel,
				error
			});

		if (password.length < 8) return err('Password must be at least 8 characters');
		if (password !== fd.get('passwordRepeat')) return err("Passwords don't match");

		const user = await findUser(email);
		if (!user) return err('The code is invalid or has expired');
		const check = await verifyUserCode(user.id, 'password-reset', str(fd, 'code', 10));
		if (!check.ok) return err(check.error);

		await db.transaction(async (tx) => {
			await tx
				.update(users)
				.set({ passwordHash: await hashPassword(password) })
				.where(eq(users.id, user.id));
			// a reset signs out every other device
			await tx.delete(sessions).where(eq(sessions.userId, user.id));
			await tx
				.delete(userCodes)
				.where(and(eq(userCodes.userId, user.id), eq(userCodes.purpose, 'password-reset')));
		});
		await createSession(cookies, user.id);
		redirect(303, '/');
	}
};
