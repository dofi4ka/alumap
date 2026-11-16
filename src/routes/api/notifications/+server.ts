import { json } from '@sveltejs/kit';
import { desc, eq, isNull, and } from 'drizzle-orm';
import { db, notifications } from '#lib/server/db/index.ts';
import type { RequestHandler } from './$types';

/** Latest notifications for the bell popup. */
export const GET: RequestHandler = async ({ locals }) => {
	const rows = await db
		.select()
		.from(notifications)
		.where(eq(notifications.userId, locals.user!.id))
		.orderBy(desc(notifications.createdAt))
		.limit(50);
	return json({
		notifications: rows.map((n) => ({
			id: n.id,
			message: n.message,
			actorNanoId: n.actorNanoId,
			nearCityName: n.nearCityName,
			createdAt: n.createdAt.getTime(),
			wasUnread: !n.readAt
		}))
	});
};

/** Opening the popup marks everything as read. */
export const POST: RequestHandler = async ({ locals }) => {
	await db
		.update(notifications)
		.set({ readAt: new Date() })
		.where(and(eq(notifications.userId, locals.user!.id), isNull(notifications.readAt)));
	return json({ ok: true });
};
