import { error, redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db, projects, users } from '#lib/server/db/index.ts';
import { deleteProject, getProject } from '#lib/server/projects.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ params, locals }) => {
	const { project, canEdit } = getProject(params.id, locals.user!);
	const owner = db
		.select({ id: users.id, nanoId: users.nanoId, firstName: users.firstName, lastName: users.lastName, avatarId: users.avatarId })
		.from(users)
		.where(eq(users.id, project.ownerId))
		.get()!;
	return { project, owner, canEdit, isAdmin: locals.user!.isAdmin };
};

export const actions: Actions = {
	publish: ({ params, locals }) => {
		if (!locals.user!.isAdmin) error(403, 'Forbidden');
		const { project } = getProject(params.id, locals.user!);
		db.update(projects).set({ status: 'published' }).where(eq(projects.id, project.id)).run();
	},
	delete: async ({ params, locals }) => {
		const { project, canEdit } = getProject(params.id, locals.user!);
		if (!canEdit) error(403, 'Forbidden');
		await deleteProject(project);
		redirect(303, '/projects');
	}
};
