import { json } from '@sveltejs/kit';
import { and, eq, gte, isNotNull } from 'drizzle-orm';
import { db, events, users } from '#lib/server/db/index.ts';
import { imageUrl } from '#lib/images.ts';
import { scatterInCities } from '#lib/server/scatter.ts';
import type { RequestHandler } from './$types';

export type MapFeatureProps = {
	kind: 'user' | 'event';
	id: string;
	title: string;
	subtitle: string;
	/** "img:<url>" or "initials:<XY>" for users, "img:<url>" or "event" for events */
	icon: string;
};

const point = (lng: number, lat: number, properties: MapFeatureProps) => ({
	type: 'Feature' as const,
	geometry: { type: 'Point' as const, coordinates: [lng, lat] },
	properties
});

export const GET: RequestHandler = () => {
	const people = db
		.select()
		.from(users)
		.where(
			and(
				eq(users.showLocation, true),
				eq(users.isApproved, true),
				eq(users.isBanned, false),
				isNotNull(users.locationLat),
				isNotNull(users.locationLng)
			)
		)
		.all();

	// only upcoming events (with a day of slack, see isPastEvent)
	const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString().slice(0, 16);
	const upcoming = db
		.select()
		.from(events)
		.where(and(eq(events.status, 'published'), gte(events.startsAt, since)))
		.all();

	const items = [
		...people.map((u) => ({
			key: `user:${u.id}`,
			lat: u.locationLat!,
			lng: u.locationLng!,
			props: {
				kind: 'user',
				id: u.nanoId,
				title: `${u.firstName} ${u.lastName}`,
				subtitle: u.headline ?? u.locationName ?? '',
				icon: u.avatarId
					? `img:${imageUrl(u.avatarId, true)}`
					: `initials:${(u.firstName[0] + u.lastName[0]).toUpperCase()}`
			} satisfies MapFeatureProps
		})),
		...upcoming.map((e) => ({
			key: `event:${e.id}`,
			lat: e.locationLat,
			lng: e.locationLng,
			props: {
				kind: 'event',
				id: e.nanoId,
				title: e.title,
				subtitle: `${e.startsAt.replace('T', ' ')} - ${e.locationName}`,
				icon: e.imageId ? `img:${imageUrl(e.imageId, true)}` : 'event'
			} satisfies MapFeatureProps
		}))
	];

	// users and events of one city are spread together
	return json({
		type: 'FeatureCollection',
		features: scatterInCities(items).map((i) => point(i.lng, i.lat, i.props))
	});
};
