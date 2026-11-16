import { and, eq } from 'drizzle-orm';
import { db, followedCities } from './db/index.ts';
import type { City } from './geo.ts';

export type FollowSource = 'manual' | 'location' | 'temporary';

const sameCity = (a: { lat: number; lng: number }, b: City) =>
	Math.abs(a.lat - b.lat) < 1e-9 && Math.abs(a.lng - b.lng) < 1e-9;

/**
 * Keeps the automatic follow row of a user in sync with their home or temporary location.
 * An existing row is updated instead of recreated, so a city the user disabled stays disabled.
 */
export async function syncAutoFollow(userId: number, source: Exclude<FollowSource, 'manual'>, city: City | null) {
	const rows = await db.select().from(followedCities).where(eq(followedCities.userId, userId));
	const current = rows.find((r) => r.source === source);

	if (!city) {
		if (current) await db.delete(followedCities).where(eq(followedCities.id, current.id));
		return;
	}

	const exact = rows.find((r) => sameCity(r, city));
	if (exact) {
		if (exact.name !== city.name)
			await db.update(followedCities).set({ name: city.name }).where(eq(followedCities.id, exact.id));
		// The same city is already followed (e.g. manually): only one row is needed.
		if (current && current.id !== exact.id)
			await db.delete(followedCities).where(eq(followedCities.id, current.id));
		return;
	}

	if (current) {
		await db
			.update(followedCities)
			.set({ name: city.name, lat: city.lat, lng: city.lng })
			.where(eq(followedCities.id, current.id));
	} else {
		await db.insert(followedCities).values({ userId, source, ...city, enabled: true }).onConflictDoNothing();
	}
}

export async function removeAutoFollow(userId: number, source: Exclude<FollowSource, 'manual'>) {
	await db
		.delete(followedCities)
		.where(and(eq(followedCities.userId, userId), eq(followedCities.source, source)));
}
