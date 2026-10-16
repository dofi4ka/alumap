import { error, redirect } from '@sveltejs/kit';
import { getProject, saveProject } from '#lib/server/projects.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ params, locals }) => {
	const { project, canEdit } = getProject(params.id, locals.user!);
	if (!canEdit) error(403, 'Forbidden');
	return { project };
};

export const actions: Actions = {
	default: async ({ request, locals, params }) => {
		const { project, canEdit } = getProject(params.id, locals.user!);
		if (!canEdit) error(403, 'Forbidden');
		const result = await saveProject(await request.formData(), locals.user!, project);
		if ('nanoId' in result) redirect(303, `/projects/${result.nanoId}`);
		return result;
	}
};
