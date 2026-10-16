import { and, eq, sql, type SQL } from 'drizzle-orm';
import { badges, db, userBadges, type Badge } from './db/index.ts';

type BadgeDefinition = Pick<Badge, 'slug' | 'name' | 'description' | 'rarity' | 'svg'>;

/** Built-in badges, seeded on startup. Icons are from iconify (Material Design Icons). */
const builtIn: BadgeDefinition[] = [
	{
		slug: 'innopolis-og',
		name: "Innopolis OG",
		description: "Graduated from one of the first cohorts (2014-2019)",
		rarity: 'gold',
		// mdi:school
		svg: "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\"><path fill=\"currentColor\" d=\"M12 3L1 9l11 6l9-4.91V17h2V9M5 13.18v4L12 21l7-3.82v-4L12 17z\"/></svg>"
	},
	{
		slug: 'profile-pro',
		name: "Profile Pro",
		description: "Completed all profile fields",
		rarity: 'bronze',
		// mdi:account-check
		svg: "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\"><path fill=\"currentColor\" d=\"m21.1 12.5l1.4 1.41l-6.53 6.59L12.5 17l1.4-1.41l2.07 2.08zM10 17l3 3H3v-2c0-2.21 3.58-4 8-4l1.89.11zm1-13a4 4 0 0 1 4 4a4 4 0 0 1-4 4a4 4 0 0 1-4-4a4 4 0 0 1 4-4\"/></svg>"
	},
	{
		slug: 'pioneer',
		name: "Pioneer",
		description: "Among the first 100 alumni to pin their location on the map",
		rarity: 'silver',
		// mdi:map-marker-star
		svg: "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\"><path fill=\"currentColor\" d=\"M12 2C8.1 2 5 5.1 5 9c0 5.2 7 13 7 13s7-7.8 7-13c0-3.9-3.1-7-7-7m2.5 11L12 11.5L9.5 13l.7-2.8L8 8.3l2.9-.2L12 5.4L13.1 8l2.9.3l-2.2 1.9z\"/></svg>"
	},
	{
		slug: 'founding-host',
		name: "Founding Host",
		description: "Created the first alumni event in a city",
		rarity: 'silver',
		// mdi:flag-variant
		svg: "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\"><path fill=\"currentColor\" d=\"M6 3a1 1 0 0 1 1 1v.88C8.06 4.44 9.5 4 11 4c3 0 3 2 5 2c3 0 4-2 4-2v8s-1 2-4 2s-3-2-5-2c-3 0-4 2-4 2v7H5V4a1 1 0 0 1 1-1\"/></svg>"
	},
	{
		slug: 'networker',
		name: "Networker",
		description: "Attended 5+ alumni events",
		rarity: 'silver',
		// mdi:account-group
		svg: "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\"><path fill=\"currentColor\" d=\"M12 5.5A3.5 3.5 0 0 1 15.5 9a3.5 3.5 0 0 1-3.5 3.5A3.5 3.5 0 0 1 8.5 9A3.5 3.5 0 0 1 12 5.5M5 8c.56 0 1.08.15 1.53.42c-.15 1.43.27 2.85 1.13 3.96C7.16 13.34 6.16 14 5 14a3 3 0 0 1-3-3a3 3 0 0 1 3-3m14 0a3 3 0 0 1 3 3a3 3 0 0 1-3 3c-1.16 0-2.16-.66-2.66-1.62a5.54 5.54 0 0 0 1.13-3.96c.45-.27.97-.42 1.53-.42M5.5 18.25c0-2.07 2.91-3.75 6.5-3.75s6.5 1.68 6.5 3.75V20h-13zM0 20v-1.5c0-1.39 1.89-2.56 4.45-2.9c-.59.68-.95 1.62-.95 2.65V20zm24 0h-3.5v-1.75c0-1.03-.36-1.97-.95-2.65c2.56.34 4.45 1.51 4.45 2.9z\"/></svg>"
	},
	{
		slug: 'host-with-the-most',
		name: "Host with the most",
		description: "Organized 3+ events in different cities",
		rarity: 'gold',
		// mdi:city-variant
		svg: "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\"><path fill=\"currentColor\" d=\"M19 9V7a2 2 0 0 0-2-2h-1V2h-2v3h-1a2 2 0 0 0-2 2v2a2 2 0 0 0-2 2v1H5a2 2 0 0 0-2 2v8h3v-2h2v2h4v-2h2v2h2v-2h2v2h3V11a2 2 0 0 0-2-2M8 18H6v-2h2zm6 0h-2v-2h2zm0-4h-2v-2h2zm-1-5V7h4v2zm5 9h-2v-2h2zm0-4h-2v-2h2z\"/></svg>"
	},
	{
		slug: 'rainmaker',
		name: "Rainmaker",
		description: "An event you created had 20+ attendees",
		rarity: 'gold',
		// mdi:weather-pouring
		svg: "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\"><path fill=\"currentColor\" d=\"M9 12c.53.14.85.69.71 1.22l-1.3 4.83c-.14.54-.69.85-1.22.71a.967.967 0 0 1-.69-1.22l1.28-4.83c.14-.54.69-.85 1.22-.71m4 0c.53.14.85.69.71 1.22l-2.07 7.73c-.14.55-.69.85-1.23.71c-.53-.16-.85-.69-.71-1.23l2.08-7.72c.14-.54.69-.85 1.22-.71m4 0c.53.14.85.69.71 1.22l-1.3 4.83c-.14.54-.69.85-1.22.71a.967.967 0 0 1-.69-1.22l1.28-4.83c.14-.54.69-.85 1.22-.71m0-2V9a5 5 0 0 0-5-5C9.5 4 7.45 5.82 7.06 8.19C6.73 8.07 6.37 8 6 8a3 3 0 0 0-3 3c0 1.11.6 2.08 1.5 2.6v-.01c.5.28.64.91.37 1.37c-.28.47-.87.64-1.37.36v.01A4.98 4.98 0 0 1 1 11a5 5 0 0 1 5-5c1-2.35 3.3-4 6-4c3.43 0 6.24 2.66 6.5 6.03L19 8a4 4 0 0 1 4 4c0 1.5-.8 2.77-2 3.46c-.5.27-1.09.11-1.37-.37c-.27-.48-.13-1.09.37-1.37v.01c.6-.34 1-.99 1-1.73a2 2 0 0 0-2-2z\"/></svg>"
	},
	{
		slug: 'cross-city-commuter',
		name: "Cross-city commuter",
		description: "Attended an event in a city different from pinned in your profile",
		rarity: 'bronze',
		// mdi:train-car
		svg: "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\"><path fill=\"currentColor\" d=\"M12 4H5a3 3 0 0 0-3 3v8a3 3 0 0 0 3 3l-1 1v1h1l2-2.03L9 18v-5H4V6h9v2h2V7a3 3 0 0 0-3-3M5 14a1 1 0 0 1 1 1a1 1 0 0 1-1 1a1 1 0 0 1-1-1a1 1 0 0 1 1-1m15.57-4.34c-.14-.4-.52-.66-.97-.66h-7.19c-.46 0-.83.26-.98.66L10 13.77v5.51c0 .38.32.72.7.72h.62c.38 0 .68-.38.68-.76V18h8v1.24c0 .38.31.76.69.76h.61c.38 0 .7-.34.7-.72v-5.51zm-8.16.34h7.19l1.03 3h-9.25zM12 16a1 1 0 0 1-1-1a1 1 0 0 1 1-1a1 1 0 0 1 1 1a1 1 0 0 1-1 1m8 0a1 1 0 0 1-1-1a1 1 0 0 1 1-1a1 1 0 0 1 1 1a1 1 0 0 1-1 1\"/></svg>"
	},
	{
		slug: 'badge-collector',
		name: "Badge collector",
		description: "Earned 10+ badges",
		rarity: 'gold',
		// mdi:trophy
		svg: "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\"><path fill=\"currentColor\" d=\"M18 2c-.9 0-2 1-2 2H8c0-1-1.1-2-2-2H2v9c0 1 1 2 2 2h2.2c.4 2 1.7 3.7 4.8 4v2.08C8 19.54 8 22 8 22h8s0-2.46-3-2.92V17c3.1-.3 4.4-2 4.8-4H20c1 0 2-1 2-2V2zM6 11H4V4h2zm14 0h-2V4h2z\"/></svg>"
	},
	{
		slug: 'contributor',
		name: "Contributor",
		description: "Contributed to the alumap codebase",
		rarity: 'silver',
		// mdi:source-branch
		svg: "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\"><path fill=\"currentColor\" d=\"M13 14c-3.36 0-4.46 1.35-4.82 2.24C9.25 16.7 10 17.76 10 19a3 3 0 0 1-3 3a3 3 0 0 1-3-3c0-1.31.83-2.42 2-2.83V7.83A2.99 2.99 0 0 1 4 5a3 3 0 0 1 3-3a3 3 0 0 1 3 3c0 1.31-.83 2.42-2 2.83v5.29c.88-.65 2.16-1.12 4-1.12c2.67 0 3.56-1.34 3.85-2.23A3.01 3.01 0 0 1 14 7a3 3 0 0 1 3-3a3 3 0 0 1 3 3c0 1.34-.88 2.5-2.09 2.86C17.65 11.29 16.68 14 13 14m-6 4a1 1 0 0 0-1 1a1 1 0 0 0 1 1a1 1 0 0 0 1-1a1 1 0 0 0-1-1M7 4a1 1 0 0 0-1 1a1 1 0 0 0 1 1a1 1 0 0 0 1-1a1 1 0 0 0-1-1m10 2a1 1 0 0 0-1 1a1 1 0 0 0 1 1a1 1 0 0 0 1-1a1 1 0 0 0-1-1\"/></svg>"
	},
	{
		slug: 'suggestion-box',
		name: "Suggestion box",
		description: "Submitted a badge or a feature idea that got implemented",
		rarity: 'silver',
		// mdi:lightbulb-on
		svg: "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\"><path fill=\"currentColor\" d=\"M12 6a6 6 0 0 1 6 6c0 2.22-1.21 4.16-3 5.2V19a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1v-1.8c-1.79-1.04-3-2.98-3-5.2a6 6 0 0 1 6-6m2 15v1a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1v-1zm6-10h3v2h-3zM1 11h3v2H1zM13 1v3h-2V1zM4.92 3.5l2.13 2.14l-1.42 1.41L3.5 4.93zm12.03 2.13l2.12-2.13l1.43 1.43l-2.13 2.12z\"/></svg>"
	}
];

/** Slugs of built-in badges: they can be edited by admins, but not deleted. */
export const builtInSlugs = new Set(builtIn.map((b) => b.slug));

/** Inserts missing built-in badges; existing ones are left as admins edited them. */
export function seedBadges() {
	for (const b of builtIn) db.insert(badges).values(b).onConflictDoNothing().run();
}

/** Thresholds of countable badges, shared by granting and progress. */
const targets = {
	'profile-pro': 6,
	networker: 5,
	'host-with-the-most': 3,
	rainmaker: 20,
	'badge-collector': 10
} as const;

/** Number of filled profile parts out of 8, for user row `u` */
const profileParts = sql`(
	(u.avatar_id is not null) + (u.headline is not null) + (u.bio is not null)
	+ (u.location_name is not null) + (u.birthday is not null)
	+ (coalesce(u.telegram_username, u.contact_email, u.contact_phone, u.website) is not null)
	+ exists (select 1 from experiences e where e.user_id = u.id)
	+ exists (select 1 from skills s where s.user_id = u.id)
)`;

/** (event_id, user_id) of everyone who organized an event: the main organizer and co-organizers */
const organizers = sql`(select id as event_id, owner_id as user_id from events union select event_id, user_id from event_organizers)`;

/** Number of attendees of event row `e` */
const attendees = sql`(select count(*) from event_participants p where p.event_id = e.id)`;

const nowString = () => new Date().toISOString().slice(0, 16);

/**
 * Criteria of automatic badges: queries selecting `user_id`s who deserve the badge.
 * Event times are venue local time without timezone, compared with UTC "now" - good enough for badges.
 * Badges not listed here (contributor, suggestion-box, admin-created) are granted only by admins.
 */
const criteria: Record<string, (now: string, badgeId: number) => SQL> = {
	'innopolis-og': () => sql`select id as user_id from users where graduation_year between 2014 and 2019`,

	// most of the 8 profile parts are filled
	'profile-pro': () => sql`select u.id as user_id from users u where ${profileParts} >= ${targets['profile-pro']}`,

	// whoever shares the location while fewer than 100 pioneers were granted (removed ones count too)
	pioneer: (_, badgeId) => sql`
		select id as user_id from users
		where show_location = 1 and location_lat is not null
			and id not in (select user_id from user_badges where badge_id = ${badgeId})
		order by id
		limit max(0, 100 - (select count(*) from user_badges where badge_id = ${badgeId}))`,

	// organizers of the first published event of every city
	'founding-host': () => sql`
		select o.user_id from ${organizers} o join events e on e.id = o.event_id
		where e.status = 'published' and e.id = (
			select min(e2.id) from events e2
			where e2.status = 'published' and e2.location_lat = e.location_lat and e2.location_lng = e.location_lng
		)`,

	// attendance counts only after the event started
	networker: (now) => sql`
		select p.user_id from event_participants p join events e on e.id = p.event_id
		where e.status = 'published' and e.starts_at <= ${now}
		group by p.user_id having count(*) >= ${targets.networker}`,

	// an event counts as organized only after it started
	'host-with-the-most': (now) => sql`
		select o.user_id from ${organizers} o join events e on e.id = o.event_id
		where e.status = 'published' and e.starts_at <= ${now}
		group by o.user_id having count(distinct e.location_name) >= ${targets['host-with-the-most']}`,

	rainmaker: () => sql`
		select o.user_id from ${organizers} o join events e on e.id = o.event_id
		where e.status = 'published' and ${attendees} >= ${targets.rainmaker}`,

	'cross-city-commuter': (now) => sql`
		select p.user_id from event_participants p
			join events e on e.id = p.event_id
			join users u on u.id = p.user_id
		where e.status = 'published' and e.starts_at <= ${now}
			and u.location_name is not null and e.location_name != u.location_name`,

	// must stay last: counts badges granted above
	'badge-collector': () => sql`
		select user_id from user_badges where removed = 0
		group by user_id having count(*) >= ${targets['badge-collector']}`
};

/**
 * Gives automatic badges to everyone who deserves them and doesn't have them yet.
 * A row removed by an admin still exists, so `on conflict do nothing` keeps it removed.
 */
export function grantAutoBadges() {
	const now = nowString();
	const ids = new Map(db.select({ id: badges.id, slug: badges.slug }).from(badges).all().map((b) => [b.slug, b.id]));
	db.transaction((tx) => {
		for (const [slug, query] of Object.entries(criteria)) {
			const badgeId = ids.get(slug);
			if (!badgeId) continue;
			tx.run(sql`
				insert into user_badges (user_id, badge_id)
				select user_id, ${badgeId} from (${query(now, badgeId)}) where true
				on conflict do nothing`); // "where true" lets sqlite parse "on conflict" after a select
		}
	});
}

/** Progress of one user towards countable badges, by slug. Same rules as the criteria above. */
export function badgeProgress(userId: number): Record<string, { current: number; target: number }> {
	const now = nowString();
	const value = (query: SQL) => Number(db.get<{ v: number | null }>(sql`select (${query}) as v`)?.v ?? 0);
	const current: Record<keyof typeof targets, number> = {
		'profile-pro': value(sql`select ${profileParts} from users u where u.id = ${userId}`),
		networker: value(sql`
			select count(*) from event_participants p join events e on e.id = p.event_id
			where p.user_id = ${userId} and e.status = 'published' and e.starts_at <= ${now}`),
		'host-with-the-most': value(sql`
			select count(distinct e.location_name) from ${organizers} o join events e on e.id = o.event_id
			where o.user_id = ${userId} and e.status = 'published' and e.starts_at <= ${now}`),
		rainmaker: value(sql`
			select max(${attendees}) from ${organizers} o join events e on e.id = o.event_id
			where o.user_id = ${userId} and e.status = 'published'`),
		'badge-collector': value(sql`select count(*) from user_badges where user_id = ${userId} and removed = 0`)
	};
	return Object.fromEntries(
		Object.entries(targets).map(([slug, target]) => [
			slug,
			{ current: Math.min(current[slug as keyof typeof targets], target), target }
		])
	);
}

export function startBadgeGranting() {
	seedBadges();
	grantAutoBadges();
	// time based criteria (events that started) need a periodic check
	const g = globalThis as { __alumapBadgeTimer?: ReturnType<typeof setInterval> };
	if (!g.__alumapBadgeTimer) g.__alumapBadgeTimer = setInterval(() => grantAutoBadges(), 60_000);
}

/** Admin actions: giving a badge clears the "removed" mark, taking it away sets it. */
export function giveBadge(userId: number, badgeId: number) {
	db.insert(userBadges)
		.values({ userId, badgeId })
		.onConflictDoUpdate({ target: [userBadges.userId, userBadges.badgeId], set: { removed: false } })
		.run();
}

export function removeBadge(userId: number, badgeId: number) {
	db.update(userBadges)
		.set({ removed: true })
		.where(and(eq(userBadges.userId, userId), eq(userBadges.badgeId, badgeId)))
		.run();
}

/** Downloads icon markup from iconify by its name, e.g. "mdi:trophy". Null if there is no such icon. */
export async function fetchIconSvg(name: string): Promise<string | null> {
	const m = /^([a-z0-9-]+):([a-z0-9-]+)$/.exec(name);
	if (!m) return null;
	const res = await fetch(`https://api.iconify.design/${m[1]}/${m[2]}.svg`).catch(() => null);
	const svg = res?.ok ? await res.text() : '';
	if (!svg.startsWith('<svg') || svg.length > 50_000) return null;
	return svg.replace(' width="1em" height="1em"', '');
}
