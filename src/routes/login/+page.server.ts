import { fail, redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { checkPassword, createSession } from '#lib/server/auth.ts';
import { db, users } from '#lib/server/db/index.ts';
import { str } from '#lib/server/forms.ts';
import type { Actions } from './$types';

export const actions: Actions = {
	default: async ({ request, cookies }) => {
		const fd = await request.formData();
		const email = str(fd, 'email')?.toLowerCase() ?? '';
		const password = (fd.get('password') as string | null) ?? '';

		const user = db.select().from(users).where(eq(users.email, email)).get();
		if (!user || !(await checkPassword(password, user.passwordHash))) {
			return fail(400, { email, error: 'Wrong email or password' });
		}
		createSession(cookies, user.id);
		redirect(303, '/');
	}
};
