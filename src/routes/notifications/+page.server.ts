import { asc, desc, eq, and, isNull } from 'drizzle-orm';
import { db, followedCities, notifications } from '#lib/server/db/index.ts';
import { location, int } from '#lib/server/forms.ts';
import { pruneExpiredTemporary } from '#lib/server/locations.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const user = await pruneExpiredTemporary(locals.user!);
	const rows = await db
		.select()
		.from(notifications)
		.where(eq(notifications.userId, user.id))
		.orderBy(desc(notifications.createdAt))
		.limit(100);

	// opening the page marks everything as read
	const unread = rows.filter((n) => !n.readAt).map((n) => n.id);
	if (unread.length)
		await db
			.update(notifications)
			.set({ readAt: new Date() })
			.where(and(eq(notifications.userId, user.id), isNull(notifications.readAt)));

	const follows = await db
		.select()
		.from(followedCities)
		.where(eq(followedCities.userId, user.id))
		.orderBy(desc(followedCities.enabled), asc(followedCities.createdAt));

	return {
		notifications: rows.map((n) => ({
			id: n.id,
			message: n.message,
			kind: n.kind,
			actorNanoId: n.actorNanoId,
			cityName: n.cityName,
			nearCityName: n.nearCityName,
			createdAt: n.createdAt,
			wasUnread: !n.readAt
		})),
		follows: follows.map((f) => ({
			id: f.id,
			name: f.name,
			lat: f.lat,
			lng: f.lng,
			source: f.source,
			enabled: f.enabled
		})),
		isApproved: user.isApproved
	};
};

export const actions: Actions = {
	addCity: async ({ request, locals }) => {
		const loc = location(await request.formData());
		if (!loc) return { error: 'Pick a city from the list' };
		const city = { name: loc.locationName, lat: loc.locationLat, lng: loc.locationLng };
		const count = await db.$count(followedCities, eq(followedCities.userId, locals.user!.id));
		if (count >= 20) return { error: 'You can follow up to 20 cities' };
		await db
			.insert(followedCities)
			.values({
				userId: locals.user!.id,
				name: city.name,
				lat: city.lat,
				lng: city.lng,
				source: 'manual',
				enabled: true
			})
			.onConflictDoUpdate({
				target: [followedCities.userId, followedCities.lat, followedCities.lng],
				set: { enabled: true }
			});
	},

	toggleCity: async ({ request, locals }) => {
		const id = int(await request.formData(), 'id');
		if (!id) return;
		const row = (
			await db
				.select()
				.from(followedCities)
				.where(and(eq(followedCities.id, id), eq(followedCities.userId, locals.user!.id)))
		)[0];
		if (!row) return;
		await db.update(followedCities).set({ enabled: !row.enabled }).where(eq(followedCities.id, row.id));
	},

	removeCity: async ({ request, locals }) => {
		const id = int(await request.formData(), 'id');
		if (id)
			await db
				.delete(followedCities)
				.where(and(eq(followedCities.id, id), eq(followedCities.userId, locals.user!.id)));
	}
};
