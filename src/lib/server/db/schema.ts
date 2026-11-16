import {
	bigint,
	boolean,
	doublePrecision,
	index,
	integer,
	pgTable,
	primaryKey,
	serial,
	text,
	timestamp,
	uniqueIndex
} from 'drizzle-orm/pg-core';

const createdAt = () => timestamp({ withTimezone: true }).notNull().defaultNow();

export const users = pgTable('users', {
	id: serial().primaryKey(),
	nanoId: text().notNull().unique(),

	/** Main personal email: used to log in, for password resets and notifications. */
	email: text().notNull().unique(),
	/** Verified Innopolis email. Null for IU friends, not null means IU alumni. */
	ssoEmail: text().unique(),
	passwordHash: text().notNull(),

	firstName: text().notNull(),
	lastName: text().notNull(),
	/** null for IU friends */
	graduationYear: integer(),
	headline: text(),
	bio: text(),
	avatarId: text(),
	/** YYYY-MM-DD */
	birthday: text(),

	telegramId: bigint({ mode: 'number' }).unique(),
	/** Kept in sync by the bot whenever the user sends it a message. */
	telegramUsername: text(),

	locationName: text(),
	locationLat: doublePrecision(),
	locationLng: doublePrecision(),

	/** Shadows the main location while `temporaryLocationExpiresAt` is in the future. */
	temporaryLocationName: text(),
	temporaryLocationLat: doublePrecision(),
	temporaryLocationLng: doublePrecision(),
	temporaryLocationExpiresAt: timestamp({ withTimezone: true }),

	isApproved: boolean().notNull().default(false),
	isBanned: boolean().notNull().default(false),
	isAdmin: boolean().notNull().default(false),

	createdAt: createdAt()
});

export const experiences = pgTable(
	'experiences',
	{
		id: serial().primaryKey(),
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

export const skills = pgTable(
	'skills',
	{
		userId: integer()
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		name: text().notNull()
	},
	(t) => [primaryKey({ columns: [t.userId, t.name] })]
);

export const events = pgTable(
	'events',
	{
		id: serial().primaryKey(),
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
		locationLat: doublePrecision().notNull(),
		locationLng: doublePrecision().notNull(),

		status: text({ enum: ['pending', 'published'] })
			.notNull()
			.default('pending'),

		createdAt: createdAt()
	},
	(t) => [index('events_status_idx').on(t.status, t.startsAt)]
);

export const eventParticipants = pgTable(
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

export const projects = pgTable(
	'projects',
	{
		id: serial().primaryKey(),
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
export const eventOrganizers = pgTable(
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

export const sessions = pgTable('sessions', {
	/** sha256 of the cookie token */
	id: text().primaryKey(),
	userId: integer()
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	expiresAt: timestamp({ withTimezone: true }).notNull()
});

/** Registrations waiting for personal email code confirmation */
export const pendingRegistrations = pgTable('pending_registrations', {
	id: serial().primaryKey(),
	email: text().notNull().unique(),
	codeHash: text().notNull(),
	attempts: integer().notNull().default(0),
	passwordHash: text().notNull(),
	firstName: text().notNull(),
	lastName: text().notNull(),
	expiresAt: timestamp({ withTimezone: true }).notNull()
});

/**
 * One-time codes for actions of an existing user: password reset, IU alumni verification
 * and changing the main email. One active code per purpose per user.
 */
export const userCodes = pgTable(
	'user_codes',
	{
		id: serial().primaryKey(),
		userId: integer()
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		purpose: text({ enum: ['password-reset', 'sso-verify', 'email-change'] }).notNull(),
		/** Address the code was sent to */
		email: text().notNull(),
		/** For sso-verify: the graduation year entered together with the email */
		graduationYear: integer(),
		codeHash: text().notNull(),
		attempts: integer().notNull().default(0),
		expiresAt: timestamp({ withTimezone: true }).notNull(),
		createdAt: createdAt()
	},
	(t) => [uniqueIndex('user_codes_user_purpose_idx').on(t.userId, t.purpose)]
);

/** One-time tokens for linking telegram account via bot deep link */
export const telegramLinkTokens = pgTable('telegram_link_tokens', {
	token: text().primaryKey(),
	userId: integer()
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	expiresAt: timestamp({ withTimezone: true }).notNull()
});

export const badges = pgTable('badges', {
	id: serial().primaryKey(),
	/** nanoid for badges created by admins, readable slug for built-in ones */
	slug: text().notNull().unique(),
	name: text().notNull(),
	description: text().notNull(),
	rarity: text({ enum: ['bronze', 'silver', 'gold'] }).notNull(),
	/** icon markup from iconify */
	svg: text().notNull(),
	createdAt: createdAt()
});

export const userBadges = pgTable(
	'user_badges',
	{
		userId: integer()
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		badgeId: integer()
			.notNull()
			.references(() => badges.id, { onDelete: 'cascade' }),
		/** taken away by an admin: the row stays so automatic granting doesn't give it back */
		removed: boolean().notNull().default(false),
		grantedAt: createdAt()
	},
	(t) => [primaryKey({ columns: [t.userId, t.badgeId] })]
);

/** Static content pages like "about", editable by admins. */
export const pages = pgTable('pages', {
	slug: text().primaryKey(),
	title: text().notNull(),
	content: text().notNull().default(''),
	updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow()
});

export type User = typeof users.$inferSelect;
export type Event = typeof events.$inferSelect;
export type Experience = typeof experiences.$inferSelect;
export type Badge = typeof badges.$inferSelect;
export type Project = typeof projects.$inferSelect;
export type Page = typeof pages.$inferSelect;

export const socialLinks = pgTable(
	'social_links',
	{
		id: serial().primaryKey(),
		userId: integer()
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		url: text().notNull(),
		createdAt: createdAt()
	},
	(t) => [index('social_links_user_idx').on(t.userId)]
);

/** Company referrals shown on a profile. A referral link is only sent to visitors when they copy it. */
export const referrals = pgTable(
	'referrals',
	{
		id: serial().primaryKey(),
		userId: integer()
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		company: text().notNull(),
		/** `link` referrals are copied from a hidden URL, `manual` ones open a Telegram DM with the alum. */
		kind: text({ enum: ['link', 'manual'] })
			.notNull()
			.default('link'),
		/** The referral URL for `link`, the company site for `manual` (used for its favicon). */
		url: text().notNull(),
		createdAt: createdAt()
	},
	(t) => [index('referrals_user_idx').on(t.userId)]
);

/** Unique visitors who copied a referral link. */
export const referralCopies = pgTable(
	'referral_copies',
	{
		referralId: integer()
			.notNull()
			.references(() => referrals.id, { onDelete: 'cascade' }),
		userId: integer()
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		createdAt: createdAt()
	},
	(t) => [primaryKey({ columns: [t.referralId, t.userId] })]
);

/** Cities whose new alumni the user wants to hear about. */
export const followedCities = pgTable(
	'followed_cities',
	{
		id: serial().primaryKey(),
		userId: integer()
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		name: text().notNull(),
		lat: doublePrecision().notNull(),
		lng: doublePrecision().notNull(),
		/** `location` and `temporary` rows are maintained from the profile and kept by default. */
		source: text({ enum: ['manual', 'location', 'temporary'] })
			.notNull()
			.default('manual'),
		enabled: boolean().notNull().default(true),
		createdAt: createdAt()
	},
	(t) => [
		index('followed_cities_user_idx').on(t.userId),
		uniqueIndex('followed_cities_user_city_idx').on(t.userId, t.lat, t.lng)
	]
);

export const notifications = pgTable(
	'notifications',
	{
		id: serial().primaryKey(),
		userId: integer()
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		/** Public id of the alum who moved, so the notification can link to their profile. */
		actorNanoId: text(),
		/** Public id of a newly published event, so the notification can link to it. */
		eventNanoId: text(),
		kind: text({ enum: ['appeared', 'moved', 'temporary', 'event'] }).notNull(),
		message: text().notNull(),
		cityName: text().notNull(),
		cityLat: doublePrecision().notNull(),
		cityLng: doublePrecision().notNull(),
		/** Name of the followed city when the alum is not exactly there */
		nearCityName: text(),
		readAt: timestamp({ withTimezone: true }),
		createdAt: createdAt()
	},
	(t) => [index('notifications_user_idx').on(t.userId, t.createdAt)]
);

export type UserCode = typeof userCodes.$inferSelect;
export type SocialLink = typeof socialLinks.$inferSelect;
export type Referral = typeof referrals.$inferSelect;
export type FollowedCity = typeof followedCities.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
