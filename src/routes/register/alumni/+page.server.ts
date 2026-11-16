import { fail, redirect } from '@sveltejs/kit';
import { and, eq, ne } from 'drizzle-orm';
import { isAlumniEmail } from '#lib/emails.ts';
import { db, users } from '#lib/server/db/index.ts';
import { sendVerificationCode } from '#lib/server/email.ts';
import { int, str } from '#lib/server/forms.ts';
import { deleteUserCode, findUserCode, issueUserCode, verifyUserCode } from '#lib/server/user-codes.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals }) => {
	const user = locals.user!;
	// Already an IU alumnus: this step is done.
	if (user.ssoEmail) redirect(303, `/u/${user.nanoId}`);
	return { graduationYear: user.graduationYear };
};

const yearOk = (year: number | null) =>
	year !== null && year >= 2014 && year <= new Date().getFullYear() + 1;

export const actions: Actions = {
	start: async ({ request, locals }) => {
		const me = locals.user!;
		const fd = await request.formData();
		const ssoEmail = str(fd, 'ssoEmail')?.toLowerCase() ?? '';
		const graduationYear = int(fd, 'graduationYear');
		const values = { ssoEmail, graduationYear };
		const err = (error: string) => fail(400, { ...values, error });

		if (!isAlumniEmail(ssoEmail))
			return err('Enter your @innopolis.university or @innopolis.ru email');
		if (!yearOk(graduationYear))
			return err(`Graduation year must be between 2014 and ${new Date().getFullYear() + 1}`);
		const taken = (
			await db
				.select({ id: users.id })
				.from(users)
				.where(and(eq(users.ssoEmail, ssoEmail), ne(users.id, me.id)))
		)[0];
		if (taken) return err('This Innopolis email is already verified by another account');

		const code = await issueUserCode({
			userId: me.id,
			purpose: 'sso-verify',
			email: ssoEmail,
			graduationYear
		});
		try {
			await sendVerificationCode(ssoEmail, code, 'sso-verify');
		} catch (e) {
			console.error('[email]', e);
			return err('Could not send the email, try again later');
		}
		return { step: 'verify' as const, ...values };
	},

	resend: async ({ locals }) => {
		const me = locals.user!;
		const stored = await findUserCode(me.id, 'sso-verify');
		if (!stored) return fail(400, { error: 'Enter your Innopolis email again' });
		const code = await issueUserCode({
			userId: me.id,
			purpose: 'sso-verify',
			email: stored.email,
			graduationYear: stored.graduationYear
		});
		try {
			await sendVerificationCode(stored.email, code, 'sso-verify');
		} catch (e) {
			console.error('[email]', e);
			return fail(400, {
				step: 'verify' as const,
				ssoEmail: stored.email,
				graduationYear: stored.graduationYear,
				error: 'Could not send the email, try again later'
			});
		}
		return {
			step: 'verify' as const,
			ssoEmail: stored.email,
			graduationYear: stored.graduationYear,
			resent: true
		};
	},

	verify: async ({ request, locals }) => {
		const me = locals.user!;
		const fd = await request.formData();
		const stored = await findUserCode(me.id, 'sso-verify');
		const check = await verifyUserCode(me.id, 'sso-verify', str(fd, 'code', 10));
		if (!check.ok)
			return fail(400, {
				step: 'verify' as const,
				ssoEmail: stored?.email,
				graduationYear: stored?.graduationYear,
				error: check.error
			});

		const ssoEmail = check.code.email;
		const taken = (
			await db
				.select({ id: users.id })
				.from(users)
				.where(and(eq(users.ssoEmail, ssoEmail), ne(users.id, me.id)))
		)[0];
		if (taken)
			return fail(400, {
				step: 'verify' as const,
				ssoEmail,
				error: 'This Innopolis email is already verified by another account'
			});

		try {
			await db
				.update(users)
				.set({ ssoEmail, graduationYear: check.code.graduationYear ?? me.graduationYear })
				.where(eq(users.id, me.id));
		} catch (e) {
			console.error('[sso verify]', e);
			return fail(400, {
				step: 'verify' as const,
				ssoEmail,
				error: 'This Innopolis email is already verified by another account'
			});
		}
		await deleteUserCode(me.id, 'sso-verify');
		redirect(303, `/u/${me.nanoId}`);
	},

	skip: async ({ locals }) => {
		redirect(303, `/u/${locals.user!.nanoId}`);
	}
};
