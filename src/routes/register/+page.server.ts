import crypto from 'node:crypto';
import { fail, redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { createSession, hashPassword, isAlumniEmail, sha256 } from '#lib/server/auth.ts';
import { db, pendingRegistrations, users } from '#lib/server/db/index.ts';
import { sendVerificationCode } from '#lib/server/email.ts';
import { str } from '#lib/server/forms.ts';
import { publicId } from '#lib/server/ids.ts';
import type { Actions } from './$types';

const CODE_TTL = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;

async function issueCode(email: string) {
	const code = crypto.randomInt(0, 1_000_000).toString().padStart(6, '0');
	await db
		.update(pendingRegistrations)
		.set({ codeHash: sha256(code), attempts: 0, expiresAt: new Date(Date.now() + CODE_TTL) })
		.where(eq(pendingRegistrations.email, email));
	await sendVerificationCode(email, code, 'registration');
}

export const actions: Actions = {
	start: async ({ request }) => {
		const fd = await request.formData();
		const email = str(fd, 'email')?.toLowerCase() ?? '';
		const firstName = str(fd, 'firstName', 60);
		const lastName = str(fd, 'lastName', 60);
		const password = (fd.get('password') as string | null) ?? '';
		const values = { email, firstName, lastName };

		const err = (error: string) => fail(400, { ...values, error });
		if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return err('Enter a valid email');
		if (isAlumniEmail(email))
			return err(
				'Please use your personal email here (Gmail, Yandex, etc.). You will add and verify your Innopolis email in step 2.'
			);
		if (!firstName || !lastName) return err('Enter your first and last name');
		if (password.length < 8) return err('Password must be at least 8 characters');
		if (password !== fd.get('passwordRepeat')) return err("Passwords don't match");
		if ((await db.select({ id: users.id }).from(users).where(eq(users.email, email)))[0])
			return err('An account with this email already exists');

		const row = {
			email,
			firstName,
			lastName,
			passwordHash: await hashPassword(password),
			codeHash: '',
			expiresAt: new Date()
		};
		await db
			.insert(pendingRegistrations)
			.values(row)
			.onConflictDoUpdate({ target: pendingRegistrations.email, set: row });

		try {
			await issueCode(email);
		} catch (e) {
			console.error('[email]', e);
			return err('Could not send the email, try again later');
		}
		return { step: 'verify' as const, email };
	},

	resend: async ({ request }) => {
		const email = str(await request.formData(), 'email')?.toLowerCase() ?? '';
		const pending = (
			await db.select().from(pendingRegistrations).where(eq(pendingRegistrations.email, email))
		)[0];
		if (!pending)
			return fail(400, { step: 'verify' as const, email, error: 'Start registration again' });
		try {
			await issueCode(email);
		} catch (e) {
			console.error('[email]', e);
			return fail(400, {
				step: 'verify' as const,
				email,
				error: 'Could not send the email, try again later'
			});
		}
		return { step: 'verify' as const, email, resent: true };
	},

	verify: async ({ request, cookies }) => {
		const fd = await request.formData();
		const email = str(fd, 'email')?.toLowerCase() ?? '';
		const code = (str(fd, 'code', 10) ?? '').replace(/\D/g, '');
		const err = (error: string) => fail(400, { step: 'verify' as const, email, error });

		const pending = (
			await db.select().from(pendingRegistrations).where(eq(pendingRegistrations.email, email))
		)[0];
		if (!pending) return err('Start registration again');
		if (pending.expiresAt.getTime() < Date.now() || pending.attempts >= MAX_ATTEMPTS)
			return err('The code has expired, request a new one');
		if (code.length !== 6 || sha256(code) !== pending.codeHash) {
			await db
				.update(pendingRegistrations)
				.set({ attempts: pending.attempts + 1 })
				.where(eq(pendingRegistrations.id, pending.id));
			return err('Wrong code');
		}

		const user = await db.transaction(async (tx) => {
			await tx.delete(pendingRegistrations).where(eq(pendingRegistrations.id, pending.id));
			const [created] = await tx
				.insert(users)
				.values({
					nanoId: publicId(),
					email,
					passwordHash: pending.passwordHash,
					firstName: pending.firstName,
					lastName: pending.lastName
				})
				.onConflictDoNothing()
				.returning();
			return created ?? null;
		});
		if (!user) return err('An account with this email already exists');

		await createSession(cookies, user.id);
		// The second step (Innopolis email) can also be skipped and done later from the profile.
		redirect(303, '/register/alumni');
	}
};
