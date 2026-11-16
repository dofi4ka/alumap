import { eq } from 'drizzle-orm';
import { db, users, type User } from './db/index.ts';
import { removeAutoFollow, syncAutoFollow } from './followed-cities.ts';
import {
	durationExpiresAt,
	effectiveLocation,
	parseDuration,
	type City,
	type EffectiveLocation
} from './geo.ts';
import { notifyMovement } from './notifications.ts';

export const getUser = async (id: number) =>
	(await db.select().from(users).where(eq(users.id, id)))[0] ?? null;

export const sameLocation = (a: City | null, b: City | null) =>
	a?.name === b?.name && a?.lat === b?.lat && a?.lng === b?.lng;

/**
 * Saves the home city, keeps the default followed city in sync and tells followers
 * when the alum actually appears somewhere new (a temporary location may still shadow it).
 */
export async function updateHomeLocation(user: User, city: City | null) {
	const before = effectiveLocation(user);
	const updated: User = {
		...user,
		locationName: city?.name ?? null,
		locationLat: city?.lat ?? null,
		locationLng: city?.lng ?? null
	};
	await db
		.update(users)
		.set({
			locationName: updated.locationName,
			locationLat: updated.locationLat,
			locationLng: updated.locationLng
		})
		.where(eq(users.id, user.id));
	await syncAutoFollow(user.id, 'location', city);

	const after = effectiveLocation(updated);
	if (after && !sameLocation(before, after)) await notifyMovement(updated, after, 'moved');
};

/** Sets a temporary city that shadows the home location until the duration runs out. */
export async function setTemporaryLocation(
	userId: number,
	city: City,
	duration: string
): Promise<{ ok: true; expiresAt: Date; label: string } | { ok: false; error: string }> {
	const parsed = parseDuration(duration);
	const expiresAt = durationExpiresAt(duration);
	if (!parsed || !expiresAt || expiresAt.getTime() <= Date.now())
		return { ok: false, error: 'Use a duration like 14d, 3w or 2m (up to a year)' };

	const user = await getUser(userId);
	if (!user) return { ok: false, error: 'User not found' };

	const before: EffectiveLocation | null = effectiveLocation(user);
	const updated: User = {
		...user,
		temporaryLocationName: city.name,
		temporaryLocationLat: city.lat,
		temporaryLocationLng: city.lng,
		temporaryLocationExpiresAt: expiresAt
	};
	await db
		.update(users)
		.set({
			temporaryLocationName: updated.temporaryLocationName,
			temporaryLocationLat: updated.temporaryLocationLat,
			temporaryLocationLng: updated.temporaryLocationLng,
			temporaryLocationExpiresAt: updated.temporaryLocationExpiresAt
		})
		.where(eq(users.id, userId));
	await syncAutoFollow(userId, 'temporary', city);

	const after = effectiveLocation(updated);
	if (after && !sameLocation(before, after)) await notifyMovement(updated, after, 'temporary');
	return { ok: true, expiresAt, label: parsed.label };
}

export async function clearTemporaryLocation(userId: number) {
	await db
		.update(users)
		.set({
			temporaryLocationName: null,
			temporaryLocationLat: null,
			temporaryLocationLng: null,
			temporaryLocationExpiresAt: null
		})
		.where(eq(users.id, userId));
	await removeAutoFollow(userId, 'temporary');
}

/** Clears an expired temporary location lazily, before its data is shown. */
export async function pruneExpiredTemporary(user: User): Promise<User> {
	if (!user.temporaryLocationExpiresAt || user.temporaryLocationExpiresAt.getTime() > Date.now())
		return user;
	await clearTemporaryLocation(user.id);
	return {
		...user,
		temporaryLocationName: null,
		temporaryLocationLat: null,
		temporaryLocationLng: null,
		temporaryLocationExpiresAt: null
	};
}
