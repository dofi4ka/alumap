import { desc, eq, or } from 'drizzle-orm';
import { db, projects } from '#lib/server/db/index.ts';
import { richTextPreview } from '#lib/server/rich-text.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const me = locals.user!;
	const rows = await db
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
		.orderBy(desc(projects.createdAt), desc(projects.id));
	const withPreview = rows.map((p) => ({ ...p, description: richTextPreview(p.description) }));
	return {
		published: withPreview.filter((p) => p.status === 'published'),
		mine: withPreview.filter((p) => p.status === 'pending')
	};
};
