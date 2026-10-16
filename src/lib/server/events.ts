import { error, fail, type ActionFailure } from '@sveltejs/kit';
import { and, asc, eq, inArray, ne } from 'drizzle-orm';
import { db, eventOrganizers, eventParticipants, events, users, type Event, type User } from './db/index.ts';
import { DATETIME, int, location, str } from './forms.ts';
import { publicId } from './ids.ts';
import { deleteImage, saveImage } from './images.ts';

/** Deletes the event (attendees cascade) and its picture. */
export async function deleteEvent(event: Event) {
	db.delete(events).where(eq(events.id, event.id)).run();
	await deleteImage(event.imageId);
}

const personColumns = {
	id: users.id,
	nanoId: users.nanoId,
	firstName: users.firstName,
	lastName: users.lastName,
	avatarId: users.avatarId,
	headline: users.headline
};

/** Co-organizers of an event (without the main organizer). */
export const getCoOrganizers = (eventId: number) =>
	db
		.select(personColumns)
		.from(eventOrganizers)
		.innerJoin(users, eq(users.id, eventOrganizers.userId))
		.where(eq(eventOrganizers.eventId, eventId))
		.orderBy(asc(users.firstName))
		.all();

/** Main organizer or co-organizer: organizers don't attend their own events. */
export const isOrganizer = (event: Event, userId: number) =>
	event.ownerId === userId ||
	!!db
		.select({ id: eventOrganizers.userId })
		.from(eventOrganizers)
		.where(and(eq(eventOrganizers.eventId, event.id), eq(eventOrganizers.userId, userId)))
		.get();

/** Replaces co-organizers with the given users: only approved, not banned, not the main organizer. */
function setCoOrganizers(event: Event, userIds: number[]) {
	const valid = userIds.length
		? db
				.select({ id: users.id })
				.from(users)
				.where(
					and(
						inArray(users.id, userIds.slice(0, 20)),
						eq(users.isApproved, true),
						eq(users.isBanned, false),
						ne(users.id, event.ownerId)
					)
				)
				.all()
		: [];
	db.transaction((tx) => {
		tx.delete(eventOrganizers).where(eq(eventOrganizers.eventId, event.id)).run();
		for (const { id } of valid) {
			tx.insert(eventOrganizers).values({ eventId: event.id, userId: id }).run();
			// organizers are not attendees
			tx.delete(eventParticipants)
				.where(and(eq(eventParticipants.eventId, event.id), eq(eventParticipants.userId, id)))
				.run();
		}
	});
}

export function getEvent(nanoId: string, viewer: User) {
	const event = db.select().from(events).where(eq(events.nanoId, nanoId)).get();
	if (!event) error(404, 'Event not found');
	const canEdit = viewer.isAdmin || event.ownerId === viewer.id;
	if (event.status !== 'published' && !canEdit) error(404, 'Event not found');
	return { event, canEdit };
}

/**
 * Creates (event = null) or updates an event from form data.
 * Events of regular users go to moderation after every change, admins' events are published right away.
 */
export async function saveEvent(
	fd: FormData,
	user: User,
	event: Event | null
): Promise<Event | ActionFailure<{ error: string }>> {
	const title = str(fd, 'title', 120);
	const startsAt = str(fd, 'startsAt', 16);
	const loc = location(fd);
	const cost = int(fd, 'cost');

	if (!title) return fail(400, { error: 'Title is required' });
	if (!startsAt || !DATETIME.test(startsAt)) return fail(400, { error: 'Set date and time' });
	if (!loc) return fail(400, { error: 'Pick a city from the list' });
	if (cost !== null && (cost < 0 || cost > 10_000_000)) return fail(400, { error: 'Invalid price' });

	let imageId: string | null;
	try {
		imageId = await saveImage(fd.get('image'), 'event');
	} catch (e) {
		return fail(400, { error: (e as Error).message });
	}

	const values = {
		title,
		startsAt,
		cost: cost || null,
		description: str(fd, 'description', 5000) ?? '',
		address: str(fd, 'address', 200),
		...loc
	};

	const coOrganizers = fd.getAll('coOrganizers').map(Number).filter(Number.isInteger);

	if (!event) {
		const created = db
			.insert(events)
			.values({
				...values,
				imageId,
				nanoId: publicId(),
				ownerId: user.id,
				status: user.isAdmin ? 'published' : 'pending'
			})
			.returning()
			.get();
		setCoOrganizers(created, coOrganizers);
		return created;
	}

	const removeImage = fd.get('removeImage') === 'on';
	const updated = db
		.update(events)
		.set({
			...values,
			imageId: imageId ?? (removeImage ? null : event.imageId),
			status: user.isAdmin ? event.status : 'pending'
		})
		.where(eq(events.id, event.id))
		.returning()
		.get();
	setCoOrganizers(updated, coOrganizers);
	if (imageId || removeImage) await deleteImage(event.imageId);
	return updated;
}
