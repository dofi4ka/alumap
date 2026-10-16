import { desc, eq, or } from 'drizzle-orm';
import { db, projects } from '#lib/server/db/index.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals }) => {
	const me = locals.user!;
	const rows = db
		.select({
			nanoId: projects.nanoId,
			title: projects.title,
			description: projects.description,
			imageId: projects.imageId,
			fundraisingGoal: projects.fundraisingGoal,
			status: projects.status
		})
		.from(projects)
		.where(or(eq(projects.status, 'published'), eq(projects.ownerId, me.id)))
		.orderBy(desc(projects.createdAt), desc(projects.id))
		.all();
	return {
		published: rows.filter((p) => p.status === 'published'),
		mine: rows.filter((p) => p.status === 'pending')
	};
};
