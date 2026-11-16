import { error, redirect } from '@sveltejs/kit';
import { and, asc, eq } from 'drizzle-orm';
import { publishEvent } from '#lib/server/admin.ts';
import { db, eventParticipants, users } from '#lib/server/db/index.ts';
import { deleteEvent, getCoOrganizers, getEvent, isOrganizer } from '#lib/server/events.ts';
import { isPastEvent } from '#lib/format.ts';
import type { Actions, PageServerLoad, RequestEvent } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	const me = locals.user!;
	const { event, canEdit } = await getEvent(params.id, me);

	const owner = (
		await db
			.select({ id: users.id, nanoId: users.nanoId, firstName: users.firstName, lastName: users.lastName, avatarId: users.avatarId })
			.from(users)
			.where(eq(users.id, event.ownerId))
	)[0]!;
	/** the main organizer goes first */
	const organizers = [owner, ...(await getCoOrganizers(event.id))];
	const organizerIds = new Set(organizers.map((o) => o.id));

	const attendees = await db
		.select({
			id: users.id,
			nanoId: users.nanoId,
			firstName: users.firstName,
			lastName: users.lastName,
			avatarId: users.avatarId,
			headline: users.headline
		})
		.from(eventParticipants)
		.innerJoin(users, eq(users.id, eventParticipants.userId))
		.where(and(eq(eventParticipants.eventId, event.id), eq(users.isBanned, false)))
		.orderBy(asc(eventParticipants.createdAt));
	// organizers are not listed as attendees
	const participants = attendees.filter((p) => !organizerIds.has(p.id));

	return {
		event,
		organizers,
		participants,
		isOrganizer: organizerIds.has(me.id),
		joined: participants.some((p) => p.id === me.id),
		past: isPastEvent(event.startsAt),
		canEdit,
		isAdmin: me.isAdmin
	};
};

const adminEvent = async ({ params, locals }: RequestEvent) => {
	if (!locals.user!.isAdmin) error(403, 'Forbidden');
	return (await getEvent(params.id, locals.user!)).event;
};

export const actions: Actions = {
	join: async ({ params, locals }) => {
		const { event } = await getEvent(params.id, locals.user!);
		if (
			event.status !== 'published' ||
			isPastEvent(event.startsAt) ||
			(await isOrganizer(event, locals.user!.id))
		)
			error(400, 'Cannot join this event');
		await db.insert(eventParticipants).values({ eventId: event.id, userId: locals.user!.id }).onConflictDoNothing();
	},
	leave: async ({ params, locals }) => {
		const { event } = await getEvent(params.id, locals.user!);
		await db
			.delete(eventParticipants)
			.where(and(eq(eventParticipants.eventId, event.id), eq(eventParticipants.userId, locals.user!.id)));
	},
	publish: async (e) => {
		await publishEvent((await adminEvent(e)).id);
	},
	delete: async ({ params, locals }) => {
		const { event, canEdit } = await getEvent(params.id, locals.user!);
		if (!canEdit) error(403, 'Forbidden');
		await deleteEvent(event);
		redirect(303, '/events');
	}
};
