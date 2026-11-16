import { and, eq, ne, sql } from 'drizzle-orm';
import { formatEventDate } from '#lib/format.ts';
import {
	db,
	followedCities,
	notifications,
	users,
	type Event,
	type User
} from './db/index.ts';
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
export type NotificationKind = MovementKind | 'event';

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

const appLink = (path: string) =>
	env.miniappUrl ? `${env.miniappUrl.replace(/\/$/, '')}${path}` : path;

type Follower = { email: string; telegramId: number | null; near: string | null; distance: number };

/**
 * One notification per follower, using the closest followed city within 150 km.
 * Followers' expired temporary follows are ignored, as are banned/unapproved accounts.
 */
async function nearbyFollowers(city: City, excludeUserId?: number) {
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
				excludeUserId === undefined ? undefined : ne(users.id, excludeUserId),
				// an expired temporary location should not keep its auto-followed city alive
				sql`(${followedCities.source} <> 'temporary' or ${users.temporaryLocationExpiresAt} > now())`
			)
		);

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
			near: direct ? null : row.cityName,
			distance
		});
	}
	return followers;
}

type Outgoing = {
	userId: number;
	email: string;
	telegramId: number | null;
	message: string;
	near: string | null;
	kind: NotificationKind;
	actorNanoId: string | null;
	eventNanoId: string | null;
	city: City;
	link: string;
	linkLabel: string;
	emailSubject: string;
};

async function saveAndDeliver(outgoing: Outgoing[]) {
	if (outgoing.length === 0) return;

	await db.insert(notifications).values(
		outgoing.map((n) => ({
			userId: n.userId,
			actorNanoId: n.actorNanoId,
			eventNanoId: n.eventNanoId,
			kind: n.kind,
			message: n.message,
			cityName: n.city.name,
			cityLat: n.city.lat,
			cityLng: n.city.lng,
			nearCityName: n.near
		}))
	);

	// Email and Telegram failures never break the request that caused the notification.
	void Promise.allSettled(
		outgoing.flatMap((n) => {
			const deliveries = [
				sendNotificationEmail(n.email, n.emailSubject, n.message, n.link, n.linkLabel)
			];
			if (n.telegramId !== null)
				deliveries.push(
					(async () => {
						const text = `🔔 ${n.message}\n\n${n.linkLabel}: ${n.link}`;
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

/**
 * Tells everyone who follows the city (or a city within 150 km) that an alumnus is now there.
 */
export async function notifyMovement(actor: User, city: EffectiveLocation, kind: MovementKind) {
	if (!actor.isApproved || actor.isBanned) return;
	const followers = await nearbyFollowers(city, actor.id);
	if (followers.size === 0) return;

	const link = appLink(`/u/${actor.nanoId}`);
	await saveAndDeliver(
		[...followers].map(([userId, follower]) => ({
			userId,
			email: follower.email,
			telegramId: follower.telegramId,
			message: movementMessage(actor, kind, city, follower.near),
			near: follower.near,
			kind,
			actorNanoId: actor.nanoId,
			eventNanoId: null,
			city,
			link,
			linkLabel: 'Open their profile',
			emailSubject: 'Alumap: an alum is nearby'
		}))
	);
}

/** Tells followers of the event city about a newly published event. */
export async function notifyEventPublished(event: Event) {
	const city = { name: event.locationName, lat: event.locationLat, lng: event.locationLng };
	const followers = await nearbyFollowers(city, event.ownerId);
	if (followers.size === 0) return;

	const link = appLink(`/events/${event.nanoId}`);
	const when = formatEventDate(event.startsAt);
	await saveAndDeliver(
		[...followers].map(([userId, follower]) => ({
			userId,
			email: follower.email,
			telegramId: follower.telegramId,
			message: `New event in ${cityLabel(city, follower.near)}: ${event.title} (${when}).`,
			near: follower.near,
			kind: 'event',
			actorNanoId: null,
			eventNanoId: event.nanoId,
			city,
			link,
			linkLabel: 'Open event',
			emailSubject: `Alumap: new event in ${city.name}`
		}))
	);
}

/** Called on approval: the alum "appears" in their current city. */
export async function notifyAppearance(actor: User) {
	const city = effectiveLocation(actor);
	if (city) await notifyMovement(actor, city, 'appeared');
}
