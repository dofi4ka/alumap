import { sql } from 'drizzle-orm';
import { index, integer, primaryKey, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

const createdAt = () =>
	integer({ mode: 'timestamp' })
		.notNull()
		.default(sql`(unixepoch())`);

export const users = sqliteTable('users', {
	id: integer().primaryKey(),
	nanoId: text().notNull().unique(),

	email: text().notNull().unique(),
	passwordHash: text().notNull(),

	firstName: text().notNull(),
	lastName: text().notNull(),
	/** null for alumni's friends */
	graduationYear: integer(),
	headline: text(),
	bio: text(),
	avatarId: text(),
	/** YYYY-MM-DD */
	birthday: text(),

	telegramId: integer().unique(),
	telegramUsername: text(),
	contactEmail: text(),
	contactPhone: text(),
	website: text(),

	locationName: text(),
	locationLat: real(),
	locationLng: real(),
	showLocation: integer({ mode: 'boolean' }).notNull().default(false),

	isApproved: integer({ mode: 'boolean' }).notNull().default(false),
	isBanned: integer({ mode: 'boolean' }).notNull().default(false),
	isAdmin: integer({ mode: 'boolean' }).notNull().default(false),

	createdAt: createdAt()
});

export const experiences = sqliteTable(
	'experiences',
	{
		id: integer().primaryKey(),
		userId: integer()
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		title: text().notNull(),
		organization: text().notNull(),
		location: text(),
		locationType: text({ enum: ['onsite', 'hybrid', 'remote'] }),
		employmentType: text({
			enum: ['full-time', 'part-time', 'contract', 'internship', 'freelance', 'self-employed']
		}),
		/** YYYY-MM */
		startDate: text().notNull(),
		/** YYYY-MM, null means "present" */
		endDate: text(),
		description: text()
	},
	(t) => [index('experiences_user_idx').on(t.userId)]
);

export const skills = sqliteTable(
	'skills',
	{
		userId: integer()
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		name: text().notNull()
	},
	(t) => [primaryKey({ columns: [t.userId, t.name] })]
);

export const events = sqliteTable(
	'events',
	{
		id: integer().primaryKey(),
		nanoId: text().notNull().unique(),
		ownerId: integer()
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),

		title: text().notNull(),
		description: text().notNull().default(''),
		imageId: text(),
		/** Price in rubles, null = free */
		cost: integer(),
		/** Local time at the venue, YYYY-MM-DDTHH:mm */
		startsAt: text().notNull(),

		locationName: text().notNull(),
		address: text(),
		locationLat: real().notNull(),
		locationLng: real().notNull(),

		status: text({ enum: ['pending', 'published'] })
			.notNull()
			.default('pending'),

		createdAt: createdAt()
	},
	(t) => [index('events_status_idx').on(t.status, t.startsAt)]
);

export const eventParticipants = sqliteTable(
	'event_participants',
	{
		eventId: integer()
			.notNull()
			.references(() => events.id, { onDelete: 'cascade' }),
		userId: integer()
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		createdAt: createdAt()
	},
	(t) => [primaryKey({ columns: [t.eventId, t.userId] })]
);

export const projects = sqliteTable(
	'projects',
	{
		id: integer().primaryKey(),
		nanoId: text().notNull().unique(),
		ownerId: integer()
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),

		title: text().notNull(),
		description: text().notNull().default(''),
		/** square cover */
		imageId: text(),
		donationUrl: text(),
		/** rubles, null = no goal */
		fundraisingGoal: integer(),

		status: text({ enum: ['pending', 'published'] })
			.notNull()
			.default('pending'),

		createdAt: createdAt()
	},
	(t) => [index('projects_status_idx').on(t.status, t.createdAt)]
);

/** Co-organizers of events; the main organizer is `events.owner_id` and is not listed here. */
export const eventOrganizers = sqliteTable(
	'event_organizers',
	{
		eventId: integer()
			.notNull()
			.references(() => events.id, { onDelete: 'cascade' }),
		userId: integer()
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' })
	},
	(t) => [primaryKey({ columns: [t.eventId, t.userId] })]
);

export const sessions = sqliteTable('sessions', {
	/** sha256 of the cookie token */
	id: text().primaryKey(),
	userId: integer()
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	expiresAt: integer({ mode: 'timestamp' }).notNull()
});

/** Registrations waiting for email code confirmation */
export const pendingRegistrations = sqliteTable('pending_registrations', {
	id: integer().primaryKey(),
	email: text().notNull().unique(),
	codeHash: text().notNull(),
	attempts: integer().notNull().default(0),
	passwordHash: text().notNull(),
	firstName: text().notNull(),
	lastName: text().notNull(),
	graduationYear: integer(),
	expiresAt: integer({ mode: 'timestamp' }).notNull()
});

/** One-time tokens for linking telegram account via bot deep link */
export const telegramLinkTokens = sqliteTable('telegram_link_tokens', {
	token: text().primaryKey(),
	userId: integer()
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	expiresAt: integer({ mode: 'timestamp' }).notNull()
});

export const badges = sqliteTable('badges', {
	id: integer().primaryKey(),
	/** nanoid for badges created by admins, readable slug for built-in ones */
	slug: text().notNull().unique(),
	name: text().notNull(),
	description: text().notNull(),
	rarity: text({ enum: ['bronze', 'silver', 'gold'] }).notNull(),
	/** icon markup from iconify */
	svg: text().notNull(),
	createdAt: createdAt()
});

export const userBadges = sqliteTable(
	'user_badges',
	{
		userId: integer()
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		badgeId: integer()
			.notNull()
			.references(() => badges.id, { onDelete: 'cascade' }),
		/** taken away by an admin: the row stays so automatic granting doesn't give it back */
		removed: integer({ mode: 'boolean' }).notNull().default(false),
		grantedAt: createdAt()
	},
	(t) => [primaryKey({ columns: [t.userId, t.badgeId] })]
);

export type User = typeof users.$inferSelect;
export type Event = typeof events.$inferSelect;
export type Experience = typeof experiences.$inferSelect;
export type Badge = typeof badges.$inferSelect;
export type Project = typeof projects.$inferSelect;
