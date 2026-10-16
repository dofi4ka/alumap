import { and, count, desc, eq, ne, or } from 'drizzle-orm';
import { db, eventParticipants, events } from '#lib/server/db/index.ts';
import { isPastEvent } from '#lib/format.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals }) => {
	const me = locals.user!;
	const rows = db
		.select({
			nanoId: events.nanoId,
			title: events.title,
			imageId: events.imageId,
			startsAt: events.startsAt,
			locationName: events.locationName,
			cost: events.cost,
			status: events.status,
			ownerId: events.ownerId,
			participants: count(eventParticipants.userId)
		})
		.from(events)
		.leftJoin(eventParticipants, eq(eventParticipants.eventId, events.id))
		.where(or(eq(events.status, 'published'), eq(events.ownerId, me.id)))
		.groupBy(events.id)
		.orderBy(desc(events.startsAt))
		.all();

	const published = rows.filter((e) => e.status === 'published');
	return {
		upcoming: published.filter((e) => !isPastEvent(e.startsAt)).reverse(),
		past: published.filter((e) => isPastEvent(e.startsAt)),
		mine: rows.filter((e) => e.status !== 'published')
	};
};
