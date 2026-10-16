import { redirect } from '@sveltejs/kit';
import { saveProject } from '#lib/server/projects.ts';
import type { Actions } from './$types';

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const result = await saveProject(await request.formData(), locals.user!, null);
		if ('nanoId' in result) redirect(303, `/projects/${result.nanoId}`);
		return result;
	}
};
