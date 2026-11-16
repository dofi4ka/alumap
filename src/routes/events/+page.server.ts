import { desc, eq, or, sql } from 'drizzle-orm';
import { db, eventParticipants, events } from '#lib/server/db/index.ts';
import { isPastEvent } from '#lib/format.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const me = locals.user!;
	const rows = await db
		.select({
			nanoId: events.nanoId,
			title: events.title,
			imageId: events.imageId,
			startsAt: events.startsAt,
			locationName: events.locationName,
			cost: events.cost,
			status: events.status,
			ownerId: events.ownerId,
			participants: sql<number>`count(${eventParticipants.userId})::int`
		})
		.from(events)
		.leftJoin(eventParticipants, eq(eventParticipants.eventId, events.id))
		.where(or(eq(events.status, 'published'), eq(events.ownerId, me.id)))
		.groupBy(events.id)
		.orderBy(desc(events.startsAt));

	const published = rows.filter((e) => e.status === 'published');
	return {
		upcoming: published.filter((e) => !isPastEvent(e.startsAt)).reverse(),
		past: published.filter((e) => isPastEvent(e.startsAt)),
		mine: rows.filter((e) => e.status !== 'published')
	};
};
