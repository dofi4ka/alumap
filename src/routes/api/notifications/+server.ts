import { json } from '@sveltejs/kit';
import { desc, eq, isNull, and } from 'drizzle-orm';
import { db, notifications } from '#lib/server/db/index.ts';
import { hasProfilePro } from '#lib/server/badges.ts';
import type { RequestHandler } from './$types';

type Item = {
	id: number;
	kind: string;
	message: string;
	actorNanoId: string | null;
	eventNanoId: string | null;
	nearCityName: string | null;
	createdAt: number;
	wasUnread: boolean;
};

/** Latest notifications for the bell popup, plus an in-app profile reminder. */
export const GET: RequestHandler = async ({ locals }) => {
	const user = locals.user!;
	const rows = await db
		.select()
		.from(notifications)
		.where(eq(notifications.userId, user.id))
		.orderBy(desc(notifications.createdAt))
		.limit(50);

	const items: Item[] = rows.map((n) => ({
		id: n.id,
		kind: n.kind,
		message: n.message,
		actorNanoId: n.actorNanoId,
		eventNanoId: n.eventNanoId,
		nearCityName: n.nearCityName,
		createdAt: n.createdAt.getTime(),
		wasUnread: !n.readAt
	}));

	// Shown only in the bell, never delivered to Telegram or email.
	if (!(await hasProfilePro(user.id)))
		items.unshift({
			id: 0,
			kind: 'profile',
			message: 'Complete your profile to earn the Profile Pro badge.',
			actorNanoId: null,
			eventNanoId: null,
			nearCityName: null,
			createdAt: Date.now(),
			wasUnread: true
		});

	return json({ notifications: items });
};

/** Opening the popup marks everything as read. */
export const POST: RequestHandler = async ({ locals }) => {
	await db
		.update(notifications)
		.set({ readAt: new Date() })
		.where(and(eq(notifications.userId, locals.user!.id), isNull(notifications.readAt)));
	return json({ ok: true });
};
