// One-off full import from the old SQLite database into the new PostgreSQL schema.
// Usage: DATABASE_URL=... node scripts/import-sqlite-full.js /path/to/db.sqlite
//
// The script refuses to run when the new database already has user data. Everything is
// inserted in one transaction, and integer ids are preserved so old references stay valid.
import { DatabaseSync } from 'node:sqlite';
import postgres from 'postgres';

const src = process.argv[2];
if (!src) {
	console.error('Usage: node scripts/import-sqlite-full.js <db.sqlite>');
	process.exit(1);
}
if (!process.env.DATABASE_URL) {
	console.error('DATABASE_URL is not set');
	process.exit(1);
}

const old = new DatabaseSync(src, { readOnly: true });
const sql = postgres(process.env.DATABASE_URL, { max: 1 });

const asDate = (value) => (value == null ? null : new Date(Number(value) * 1000));
const asBool = (value) => !!value;
const text = (value) => (typeof value === 'string' && value.trim() !== '' ? value.trim() : null);
const email = (value) => String(value).trim().toLowerCase();
const isInnopolisEmail = (value) => /@innopolis\.(university|ru)$/i.test(value);
const normalizeUrl = (value) => {
	const url = text(value);
	if (!url) return null;
	return /^https?:\/\//i.test(url) ? url : `https://${url}`;
};

const rows = (query) => old.prepare(query).all();
const count = (query) => old.prepare(query).get().n;

const source = {
	users: rows('SELECT * FROM users ORDER BY id'),
	experiences: rows('SELECT * FROM experiences ORDER BY id'),
	skills: rows('SELECT * FROM skills ORDER BY user_id, name'),
	events: rows('SELECT * FROM events ORDER BY id'),
	eventParticipants: rows('SELECT * FROM event_participants ORDER BY event_id, user_id'),
	eventOrganizers: rows('SELECT * FROM event_organizers ORDER BY event_id, user_id'),
	projects: rows('SELECT * FROM projects ORDER BY id'),
	badges: rows('SELECT * FROM badges ORDER BY id'),
	userBadges: rows('SELECT * FROM user_badges ORDER BY user_id, badge_id'),
	pendingRegistrations: rows('SELECT * FROM pending_registrations ORDER BY id'),
	sessions: rows('SELECT * FROM sessions'),
	websiteUsers: rows(
		"SELECT id, website FROM users WHERE website IS NOT NULL AND trim(website) <> ''"
	),
	locatedUsers: rows(
		`SELECT id, location_name, location_lat, location_lng FROM users
		 WHERE location_name IS NOT NULL AND location_lat IS NOT NULL AND location_lng IS NOT NULL`
	)
};

const integrity = old.prepare('PRAGMA integrity_check').get().integrity_check;
if (integrity !== 'ok') throw new Error(`SQLite integrity check failed: ${integrity}`);

const USER_DATA_TABLES = [
	'users',
	'experiences',
	'skills',
	'events',
	'event_participants',
	'event_organizers',
	'projects',
	'user_badges',
	'pending_registrations',
	'sessions',
	'social_links',
	'followed_cities',
	'notifications',
	'referrals',
	'referral_copies',
	'user_codes'
];

const targetCounts = (
	await sql`
		SELECT
			(SELECT count(*) FROM users)::int AS users,
			(SELECT count(*) FROM experiences)::int AS experiences,
			(SELECT count(*) FROM skills)::int AS skills,
			(SELECT count(*) FROM events)::int AS events,
			(SELECT count(*) FROM event_participants)::int AS event_participants,
			(SELECT count(*) FROM event_organizers)::int AS event_organizers,
			(SELECT count(*) FROM projects)::int AS projects,
			(SELECT count(*) FROM user_badges)::int AS user_badges,
			(SELECT count(*) FROM pending_registrations)::int AS pending_registrations,
			(SELECT count(*) FROM sessions)::int AS sessions,
			(SELECT count(*) FROM social_links)::int AS social_links,
			(SELECT count(*) FROM followed_cities)::int AS followed_cities,
			(SELECT count(*) FROM notifications)::int AS notifications,
			(SELECT count(*) FROM referrals)::int AS referrals,
			(SELECT count(*) FROM referral_copies)::int AS referral_copies,
			(SELECT count(*) FROM user_codes)::int AS user_codes
	`
)[0];
const nonEmpty = USER_DATA_TABLES.filter((table) => targetCounts[table] > 0);
if (nonEmpty.length) {
	throw new Error(
		`Refusing to import: PostgreSQL already contains data in ${nonEmpty.join(', ')}`
	);
}

console.log('Source SQLite:', {
	users: source.users.length,
	experiences: source.experiences.length,
	skills: source.skills.length,
	events: source.events.length,
	participants: source.eventParticipants.length,
	projects: source.projects.length,
	badges: source.badges.length,
	userBadges: source.userBadges.length,
	sessions: source.sessions.length,
	pending: source.pendingRegistrations.length,
	socialLinks: source.websiteUsers.length,
	followedCities: source.locatedUsers.length
});

// Validate a few invariants before touching PostgreSQL.
if (new Set(source.users.map((u) => email(u.email))).size !== source.users.length)
	throw new Error('Duplicate emails in SQLite');
if (source.users.some((u) => u.email !== email(u.email)))
	console.warn('Some emails are not lowercase; they will be lowercased');
if (source.locatedUsers.length !== count('SELECT count(*) AS n FROM users WHERE location_name IS NOT NULL'))
	throw new Error('Unexpected users with incomplete location');

const oldBadgeIds = new Set(source.badges.map((b) => b.id));
if (source.userBadges.some((b) => !oldBadgeIds.has(b.badge_id)))
	throw new Error('user_badges references a missing badge');
for (const event of source.events) {
	if (!source.users.some((u) => u.id === event.owner_id))
		throw new Error(`Event ${event.id} has a missing owner`);
}
for (const project of source.projects) {
	if (!source.users.some((u) => u.id === project.owner_id))
		throw new Error(`Project ${project.id} has a missing owner`);
}

await sql.begin(async (tx) => {
	// Badges are normally seeded by the app; create anything the old DB has and the new one doesn't.
	const targetBadges = await tx`SELECT id, slug FROM badges`;
	const targetById = new Map(targetBadges.map((b) => [b.id, b.slug]));
	for (const badge of source.badges) {
		const knownSlug = targetById.get(badge.id);
		if (knownSlug === badge.slug) continue;
		if (knownSlug) throw new Error(`Badge id ${badge.id} has a different slug in PostgreSQL`);
		await tx`
			INSERT INTO badges (id, slug, name, description, rarity, svg, created_at)
			VALUES (${badge.id}, ${badge.slug}, ${badge.name}, ${badge.description},
				${badge.rarity}, ${badge.svg}, ${asDate(badge.created_at)})
			ON CONFLICT (id) DO NOTHING`;
	}
	await tx`
		SELECT setval(
			pg_get_serial_sequence('badges', 'id'),
			COALESCE((SELECT max(id) FROM badges), 1),
			(SELECT count(*) FROM badges) > 0
		)`;

	for (const u of source.users) {
		const mainEmail = email(u.email);
		await tx`
			INSERT INTO users (
				id, nano_id, email, sso_email, password_hash, first_name, last_name,
				graduation_year, headline, bio, avatar_id, birthday, telegram_id,
				telegram_username, location_name, location_lat, location_lng,
				is_approved, is_banned, is_admin, created_at
			) VALUES (
				${u.id}, ${u.nano_id}, ${mainEmail}, ${isInnopolisEmail(mainEmail) ? mainEmail : null},
				${u.password_hash}, ${u.first_name}, ${u.last_name},
				${u.graduation_year}, ${u.headline}, ${u.bio}, ${u.avatar_id}, ${u.birthday},
				${u.telegram_id}, ${text(u.telegram_username)?.replace(/^@/, '') ?? null},
				${u.location_name}, ${u.location_lat}, ${u.location_lng},
				${asBool(u.is_approved)}, ${asBool(u.is_banned)}, ${asBool(u.is_admin)},
				${asDate(u.created_at)}
			)`;
	}

	for (const e of source.experiences) {
		await tx`
			INSERT INTO experiences (
				id, user_id, title, organization, location, location_type,
				employment_type, start_date, end_date, description
			) VALUES (
				${e.id}, ${e.user_id}, ${e.title}, ${e.organization}, ${e.location},
				${e.location_type}, ${e.employment_type}, ${e.start_date}, ${e.end_date},
				${e.description}
			)`;
	}

	for (const s of source.skills) {
		await tx`INSERT INTO skills (user_id, name) VALUES (${s.user_id}, ${s.name})`;
	}

	for (const e of source.events) {
		await tx`
			INSERT INTO events (
				id, nano_id, owner_id, title, description, image_id, cost, starts_at,
				location_name, address, location_lat, location_lng, status, created_at
			) VALUES (
				${e.id}, ${e.nano_id}, ${e.owner_id}, ${e.title}, ${e.description},
				${e.image_id}, ${e.cost}, ${e.starts_at}, ${e.location_name}, ${e.address},
				${e.location_lat}, ${e.location_lng}, ${e.status}, ${asDate(e.created_at)}
			)`;
	}

	for (const p of source.eventParticipants) {
		await tx`
			INSERT INTO event_participants (event_id, user_id, created_at)
			VALUES (${p.event_id}, ${p.user_id}, ${asDate(p.created_at)})`;
	}

	for (const o of source.eventOrganizers) {
		await tx`
			INSERT INTO event_organizers (event_id, user_id)
			VALUES (${o.event_id}, ${o.user_id})`;
	}

	for (const p of source.projects) {
		await tx`
			INSERT INTO projects (
				id, nano_id, owner_id, title, description, image_id, donation_url,
				fundraising_goal, status, created_at
			) VALUES (
				${p.id}, ${p.nano_id}, ${p.owner_id}, ${p.title}, ${p.description},
				${p.image_id}, ${p.donation_url}, ${p.fundraising_goal}, ${p.status},
				${asDate(p.created_at)}
			)`;
	}

	for (const b of source.userBadges) {
		await tx`
			INSERT INTO user_badges (user_id, badge_id, removed, granted_at)
			VALUES (${b.user_id}, ${b.badge_id}, ${asBool(b.removed)}, ${asDate(b.granted_at)})`;
	}

	for (const p of source.pendingRegistrations) {
		await tx`
			INSERT INTO pending_registrations (
				id, email, code_hash, attempts, password_hash, first_name, last_name, expires_at
			) VALUES (
				${p.id}, ${email(p.email)}, ${p.code_hash}, ${p.attempts}, ${p.password_hash},
				${p.first_name}, ${p.last_name}, ${asDate(p.expires_at)}
			)`;
	}

	for (const s of source.sessions) {
		await tx`
			INSERT INTO sessions (id, user_id, expires_at)
			VALUES (${s.id}, ${s.user_id}, ${asDate(s.expires_at)})`;
	}

	for (const u of source.websiteUsers) {
		const url = normalizeUrl(u.website);
		if (url) await tx`INSERT INTO social_links (user_id, url) VALUES (${u.id}, ${url})`;
	}

	for (const u of source.locatedUsers) {
		await tx`
			INSERT INTO followed_cities (user_id, name, lat, lng, source, enabled)
			VALUES (${u.id}, ${u.location_name}, ${u.location_lat}, ${u.location_lng}, 'location', true)
			ON CONFLICT (user_id, lat, lng) DO NOTHING`;
	}

	// Explicit ids do not advance sequences.
	await tx`
		SELECT setval(
			pg_get_serial_sequence('users', 'id'),
			COALESCE((SELECT max(id) FROM users), 1),
			(SELECT count(*) FROM users) > 0
		)`;
	await tx`
		SELECT setval(
			pg_get_serial_sequence('experiences', 'id'),
			COALESCE((SELECT max(id) FROM experiences), 1),
			(SELECT count(*) FROM experiences) > 0
		)`;
	await tx`
		SELECT setval(
			pg_get_serial_sequence('events', 'id'),
			COALESCE((SELECT max(id) FROM events), 1),
			(SELECT count(*) FROM events) > 0
		)`;
	await tx`
		SELECT setval(
			pg_get_serial_sequence('projects', 'id'),
			COALESCE((SELECT max(id) FROM projects), 1),
			(SELECT count(*) FROM projects) > 0
		)`;
	await tx`
		SELECT setval(
			pg_get_serial_sequence('pending_registrations', 'id'),
			COALESCE((SELECT max(id) FROM pending_registrations), 1),
			(SELECT count(*) FROM pending_registrations) > 0
		)`;
});

const after = (
	await sql`
		SELECT
			(SELECT count(*) FROM users)::int AS users,
			(SELECT count(*) FROM experiences)::int AS experiences,
			(SELECT count(*) FROM skills)::int AS skills,
			(SELECT count(*) FROM events)::int AS events,
			(SELECT count(*) FROM event_participants)::int AS event_participants,
			(SELECT count(*) FROM event_organizers)::int AS event_organizers,
			(SELECT count(*) FROM projects)::int AS projects,
			(SELECT count(*) FROM badges)::int AS badges,
			(SELECT count(*) FROM user_badges)::int AS user_badges,
			(SELECT count(*) FROM pending_registrations)::int AS pending_registrations,
			(SELECT count(*) FROM sessions)::int AS sessions,
			(SELECT count(*) FROM social_links)::int AS social_links,
			(SELECT count(*) FROM followed_cities)::int AS followed_cities
	`
)[0];

const problems = [];
const check = (ok, message) => {
	if (!ok) problems.push(message);
};
check(after.users === source.users.length, 'users count mismatch');
check(after.experiences === source.experiences.length, 'experiences count mismatch');
check(after.skills === source.skills.length, 'skills count mismatch');
check(after.events === source.events.length, 'events count mismatch');
check(after.event_participants === source.eventParticipants.length, 'participants count mismatch');
check(after.event_organizers === source.eventOrganizers.length, 'organizers count mismatch');
check(after.projects === source.projects.length, 'projects count mismatch');
check(after.badges === source.badges.length, 'badges count mismatch');
check(after.user_badges === source.userBadges.length, 'user_badges count mismatch');
check(after.pending_registrations === source.pendingRegistrations.length, 'pending count mismatch');
check(after.sessions === source.sessions.length, 'sessions count mismatch');
check(after.social_links === source.websiteUsers.length, 'social_links count mismatch');
check(after.followed_cities === source.locatedUsers.length, 'followed_cities count mismatch');

const orphanChecks = await sql`
	SELECT
		(SELECT count(*) FROM experiences e LEFT JOIN users u ON u.id = e.user_id WHERE u.id IS NULL)::int AS experiences,
		(SELECT count(*) FROM skills s LEFT JOIN users u ON u.id = s.user_id WHERE u.id IS NULL)::int AS skills,
		(SELECT count(*) FROM events e LEFT JOIN users u ON u.id = e.owner_id WHERE u.id IS NULL)::int AS events,
		(SELECT count(*) FROM event_participants p LEFT JOIN users u ON u.id = p.user_id WHERE u.id IS NULL)::int AS participant_users,
		(SELECT count(*) FROM event_participants p LEFT JOIN events e ON e.id = p.event_id WHERE e.id IS NULL)::int AS participant_events,
		(SELECT count(*) FROM projects p LEFT JOIN users u ON u.id = p.owner_id WHERE u.id IS NULL)::int AS projects,
		(SELECT count(*) FROM user_badges b LEFT JOIN users u ON u.id = b.user_id WHERE u.id IS NULL)::int AS badge_users,
		(SELECT count(*) FROM user_badges b LEFT JOIN badges bd ON bd.id = b.badge_id WHERE bd.id IS NULL)::int AS badge_badges
`;
for (const [name, value] of Object.entries(orphanChecks[0])) {
	check(Number(value) === 0, `orphaned rows: ${name}`);
}

if (problems.length) throw new Error(`Post-import verification failed:\n- ${problems.join('\n- ')}`);

console.log('Imported:', after);
old.close();
await sql.end();
