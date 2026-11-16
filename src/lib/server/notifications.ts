import { and, eq, ne, sql } from 'drizzle-orm';
import { db, followedCities, notifications, users, type User } from './db/index.ts';
import { env } from './env.ts';
import { sendNotificationEmail } from './email.ts';
import {
	distanceKm,
	effectiveLocation,
	normalizeCityName,
	NEAR_CITY_KM,
	type City,
	type EffectiveLocation
} from './geo.ts';
import { sendTelegramMessage } from './telegram-send.ts';

export type MovementKind = 'appeared' | 'moved' | 'temporary';

const cityLabel = (city: City, near: string | null) =>
	near ? `${city.name} (near ${near})` : city.name;

export const movementMessage = (
	actor: Pick<User, 'firstName' | 'lastName' | 'nanoId'>,
	kind: MovementKind,
	city: City,
	near: string | null
) => {
	const name = `${actor.firstName} ${actor.lastName}`;
	const where = cityLabel(city, near);
	const text =
		kind === 'appeared'
			? `${name} joined Alumap in ${where}.`
			: kind === 'temporary'
				? `${name} is temporarily in ${where}.`
				: `${name} moved to ${where}.`;
	return text;
};

const profileLink = (nanoId: string) =>
	env.miniappUrl ? `${env.miniappUrl.replace(/\/$/, '')}/u/${nanoId}` : `/u/${nanoId}`;

/**
 * Tells everyone who follows the city (or a city within 150 km) that an alumnus is now there.
 * Each follower gets at most one notification, the closest followed city is used for "(near …)".
 * Email and Telegram delivery failures never break the request that caused the movement.
 */
export async function notifyMovement(actor: User, city: EffectiveLocation, kind: MovementKind) {
	if (!actor.isApproved || actor.isBanned) return;

	const rows = await db
		.select({
			userId: users.id,
			email: users.email,
			telegramId: users.telegramId,
			cityName: followedCities.name,
			lat: followedCities.lat,
			lng: followedCities.lng
		})
		.from(followedCities)
		.innerJoin(users, eq(users.id, followedCities.userId))
		.where(
			and(
				eq(followedCities.enabled, true),
				eq(users.isApproved, true),
				eq(users.isBanned, false),
				ne(users.id, actor.id),
				// an expired temporary location should not keep its auto-followed city alive
				sql`(${followedCities.source} <> 'temporary' or ${users.temporaryLocationExpiresAt} > now())`
			)
		);

	type Follower = { email: string; telegramId: number | null; near: string; distance: number };
	const followers = new Map<number, Follower>();
	for (const row of rows) {
		const followed = { name: row.cityName, lat: row.lat, lng: row.lng };
		const distance = distanceKm(city, followed);
		if (distance > NEAR_CITY_KM) continue;
		const previous = followers.get(row.userId);
		if (previous && previous.distance <= distance) continue;
		const direct =
			normalizeCityName(row.cityName) === normalizeCityName(city.name) || distance < 1;
		followers.set(row.userId, {
			email: row.email,
			telegramId: row.telegramId,
			near: direct ? '' : row.cityName,
			distance
		});
	}

	if (followers.size === 0) return;

	const created: {
		userId: number;
		message: string;
		near: string | null;
		email: string;
		telegramId: number | null;
	}[] = [];
	for (const [userId, follower] of followers) {
		const near = follower.near || null;
		created.push({
			userId,
			message: movementMessage(actor, kind, city, near),
			near,
			email: follower.email,
			telegramId: follower.telegramId
		});
	}

	await db.insert(notifications).values(
		created.map((n) => ({
			userId: n.userId,
			actorNanoId: actor.nanoId,
			kind,
			message: n.message,
			cityName: city.name,
			cityLat: city.lat,
			cityLng: city.lng,
			nearCityName: n.near
		}))
	);

	const link = profileLink(actor.nanoId);
	void Promise.allSettled(
		created.flatMap((n) => {
			const deliveries = [sendNotificationEmail(n.email, n.message, link)];
			if (n.telegramId !== null)
				deliveries.push(
					(async () => {
						const text = `🔔 ${n.message}\n\nOpen profile: ${link}`;
						const ok = await sendTelegramMessage(n.telegramId!, text);
						if (!ok) throw new Error('telegram delivery failed');
					})()
				);
			return deliveries;
		})
	).then((results) => {
		for (const result of results)
			if (result.status === 'rejected') console.error('[notifications]', result.reason);
	});
}

/** Called on approval: the alum "appears" in their current city. */
export async function notifyAppearance(actor: User) {
	const city = effectiveLocation(actor);
	if (city) await notifyMovement(actor, city, 'appeared');
}
