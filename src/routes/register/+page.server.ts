import crypto from 'node:crypto';
import { fail, redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { createSession, hashPassword, isAlumniEmail, sha256 } from '#lib/server/auth.ts';
import { db, pendingRegistrations, users } from '#lib/server/db/index.ts';
import { sendVerificationCode } from '#lib/server/email.ts';
import { int, str } from '#lib/server/forms.ts';
import { publicId } from '#lib/server/ids.ts';
import type { Actions } from './$types';

const CODE_TTL = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;

async function issueCode(email: string) {
	const code = crypto.randomInt(0, 1_000_000).toString().padStart(6, '0');
	db.update(pendingRegistrations)
		.set({ codeHash: sha256(code), attempts: 0, expiresAt: new Date(Date.now() + CODE_TTL) })
		.where(eq(pendingRegistrations.email, email))
		.run();
	await sendVerificationCode(email, code);
}

export const actions: Actions = {
	start: async ({ request }) => {
		const fd = await request.formData();
		const kind = fd.get('kind') === 'alumni' ? 'alumni' : 'friend';
		const email = str(fd, 'email')?.toLowerCase() ?? '';
		const firstName = str(fd, 'firstName', 60);
		const lastName = str(fd, 'lastName', 60);
		const graduationYear = kind === 'alumni' ? int(fd, 'graduationYear') : null;
		const password = (fd.get('password') as string | null) ?? '';
		const values = { kind, email, firstName, lastName, graduationYear };

		const err = (error: string) => fail(400, { ...values, error });
		if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return err('Enter a valid email');
		if (!firstName || !lastName) return err('Enter your first and last name');
		if (password.length < 8) return err('Password must be at least 8 characters');
		if (password !== fd.get('passwordRepeat')) return err("Passwords don't match");
		if (kind === 'alumni') {
			if (!isAlumniEmail(email))
				return err('Alumni register with an @innopolis.university or @innopolis.ru email');
			const maxYear = new Date().getFullYear() + 1;
			if (!graduationYear || graduationYear < 2014 || graduationYear > maxYear)
				return err(`Graduation year must be between 2014 and ${maxYear}`);
		}
		if (db.select({ id: users.id }).from(users).where(eq(users.email, email)).get())
			return err('An account with this email already exists');

		const row = {
			email,
			firstName,
			lastName,
			graduationYear,
			passwordHash: await hashPassword(password),
			codeHash: '',
			expiresAt: new Date()
		};
		db.insert(pendingRegistrations)
			.values(row)
			.onConflictDoUpdate({ target: pendingRegistrations.email, set: row })
			.run();

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
		const pending = db.select().from(pendingRegistrations).where(eq(pendingRegistrations.email, email)).get();
		if (!pending) return fail(400, { step: 'verify' as const, email, error: 'Start registration again' });
		await issueCode(email);
		return { step: 'verify' as const, email, resent: true };
	},

	verify: async ({ request, cookies }) => {
		const fd = await request.formData();
		const email = str(fd, 'email')?.toLowerCase() ?? '';
		const code = str(fd, 'code', 10)?.replace(/\s/g, '') ?? '';
		const err = (error: string) => fail(400, { step: 'verify' as const, email, error });

		const pending = db.select().from(pendingRegistrations).where(eq(pendingRegistrations.email, email)).get();
		if (!pending) return err('Start registration again');
		if (pending.expiresAt.getTime() < Date.now() || pending.attempts >= MAX_ATTEMPTS)
			return err('The code has expired, request a new one');
		if (sha256(code) !== pending.codeHash) {
			db.update(pendingRegistrations)
				.set({ attempts: pending.attempts + 1 })
				.where(eq(pendingRegistrations.id, pending.id))
				.run();
			return err('Wrong code');
		}

		const user = db.transaction((tx) => {
			tx.delete(pendingRegistrations).where(eq(pendingRegistrations.id, pending.id)).run();
			return tx
				.insert(users)
				.values({
					nanoId: publicId(),
					email,
					passwordHash: pending.passwordHash,
					firstName: pending.firstName,
					lastName: pending.lastName,
					graduationYear: pending.graduationYear
				})
				.onConflictDoNothing()
				.returning()
				.get();
		});
		if (!user) return err('An account with this email already exists');

		createSession(cookies, user.id);
		redirect(303, '/profile');
	}
};
