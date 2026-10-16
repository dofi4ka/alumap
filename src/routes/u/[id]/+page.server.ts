import { error, fail, redirect } from '@sveltejs/kit';
import { and, asc, desc, eq, sql } from 'drizzle-orm';
import { approveUser, setBanned } from '#lib/server/admin.ts';
import { checkPassword, hashPassword } from '#lib/server/auth.ts';
import { badges, db, experiences, skills, userBadges, users, type User } from '#lib/server/db/index.ts';
import { badgeProgress, giveBadge, removeBadge } from '#lib/server/badges.ts';
import { DAY, int, isDate, location, oneOf, str, yearMonth } from '#lib/server/forms.ts';
import { employmentTypes, locationTypes } from '#lib/format.ts';
import { deleteImage, saveImage } from '#lib/server/images.ts';
import { createLinkToken, getBotUsername } from '#lib/server/telegram.ts';
import type { Actions, PageServerLoad, RequestEvent } from './$types';

/** All badges, earned first (gold first), each with the user's progress where it is countable. */
function userBadgeList(userId: number) {
	const progress = badgeProgress(userId);
	return db
		.select({
			id: badges.id,
			slug: badges.slug,
			name: badges.name,
			description: badges.description,
			rarity: badges.rarity,
			svg: badges.svg,
			earnedAt: userBadges.grantedAt
		})
		.from(badges)
		.leftJoin(
			userBadges,
			and(eq(userBadges.badgeId, badges.id), eq(userBadges.userId, userId), eq(userBadges.removed, false))
		)
		.orderBy(
			sql`${userBadges.grantedAt} is null`,
			sql`case ${badges.rarity} when 'gold' then 0 when 'silver' then 1 else 2 end`,
			asc(badges.id)
		)
		.all()
		.map((b) => ({ ...b, progress: progress[b.slug] ?? null }));
}

function getTarget(id: string) {
	const user = db.select().from(users).where(eq(users.nanoId, id)).get();
	if (!user) error(404, 'User not found');
	return user;
}

export const load: PageServerLoad = ({ params, locals }) => {
	const me = locals.user!;
	const u = getTarget(params.id);
	const isSelf = u.id === me.id;
	if (!isSelf && !me.isAdmin && (!u.isApproved || u.isBanned)) error(404, 'User not found');

	return {
		profile: {
			id: u.id,
			nanoId: u.nanoId,
			firstName: u.firstName,
			lastName: u.lastName,
			graduationYear: u.graduationYear,
			headline: u.headline,
			bio: u.bio,
			avatarId: u.avatarId,
			birthday: u.birthday,
			telegramUsername: u.telegramUsername,
			telegramConnected: u.telegramId !== null,
			contactEmail: u.contactEmail,
			contactPhone: u.contactPhone,
			website: u.website,
			locationName: u.locationName,
			locationLat: u.locationLat,
			locationLng: u.locationLng,
			showLocation: u.showLocation,
			// private stuff only for the owner and admins
			email: isSelf || me.isAdmin ? u.email : null,
			isApproved: u.isApproved,
			isBanned: u.isBanned,
			isAdmin: u.isAdmin
		},
		experiences: db
			.select()
			.from(experiences)
			.where(eq(experiences.userId, u.id))
			.orderBy(sql`${experiences.endDate} is not null`, desc(experiences.endDate), desc(experiences.startDate))
			.all(),
		badges: userBadgeList(u.id),
		skills: db
			.select({ name: skills.name })
			.from(skills)
			.where(eq(skills.userId, u.id))
			.orderBy(asc(skills.name))
			.all()
			.map((s) => s.name),
		isSelf,
		canEdit: isSelf || me.isAdmin,
		viewerIsAdmin: me.isAdmin,
		botEnabled: !!getBotUsername()
	};
};

/** Resolves the edited user and checks that the current user may edit them. */
function editable({ params, locals }: RequestEvent): User {
	const me = locals.user!;
	const target = getTarget(params.id);
	if (target.id !== me.id && !me.isAdmin) error(403, 'Forbidden');
	return target;
}

function adminOnly({ params, locals }: RequestEvent): User {
	if (!locals.user!.isAdmin) error(403, 'Forbidden');
	return getTarget(params.id);
}

const update = (id: number, values: Partial<User>) =>
	db.update(users).set(values).where(eq(users.id, id)).run();

const normalizeUrl = (url: string | null) =>
	url && !/^https?:\/\//i.test(url) ? `https://${url}` : url;

export const actions: Actions = {
	basic: async (event) => {
		const target = editable(event);
		const fd = await event.request.formData();
		const firstName = str(fd, 'firstName', 60);
		const lastName = str(fd, 'lastName', 60);
		const birthday = str(fd, 'birthday', 10);
		if (!firstName || !lastName) return fail(400, { error: 'Name is required' });
		if (!isDate(birthday, DAY)) return fail(400, { error: 'Invalid birthday' });

		let graduationYear = target.graduationYear;
		// alumni can change their year, friends stay friends (unless admin decides otherwise)
		if (target.graduationYear !== null || event.locals.user!.isAdmin) {
			graduationYear = int(fd, 'graduationYear');
			if (graduationYear !== null && (graduationYear < 2014 || graduationYear > new Date().getFullYear() + 1))
				return fail(400, { error: 'Invalid graduation year' });
		}

		const loc = location(fd);
		update(target.id, {
			firstName,
			lastName,
			graduationYear,
			birthday,
			headline: str(fd, 'headline', 120),
			locationName: loc?.locationName ?? null,
			locationLat: loc?.locationLat ?? null,
			locationLng: loc?.locationLng ?? null,
			showLocation: !!loc && fd.get('showLocation') === 'on',
			telegramUsername: str(fd, 'telegramUsername', 40)?.replace(/^@/, '') ?? null,
			contactEmail: str(fd, 'contactEmail', 120),
			contactPhone: str(fd, 'contactPhone', 40),
			website: normalizeUrl(str(fd, 'website', 200))
		});
	},

	about: async (event) => {
		const target = editable(event);
		update(target.id, { bio: str(await event.request.formData(), 'bio', 3000) });
	},

	avatar: async (event) => {
		const target = editable(event);
		const fd = await event.request.formData();
		try {
			const avatarId = await saveImage(fd.get('avatar'), 'avatar');
			if (!avatarId) return fail(400, { error: 'Choose an image' });
			update(target.id, { avatarId });
			await deleteImage(target.avatarId);
		} catch (e) {
			return fail(400, { error: (e as Error).message });
		}
	},

	removeAvatar: async (event) => {
		const target = editable(event);
		update(target.id, { avatarId: null });
		await deleteImage(target.avatarId);
	},

	saveExperience: async (event) => {
		const target = editable(event);
		const fd = await event.request.formData();
		const id = int(fd, 'id');
		const values = {
			title: str(fd, 'title', 100),
			organization: str(fd, 'organization', 100),
			location: str(fd, 'location', 100),
			locationType: oneOf(fd, 'locationType', Object.keys(locationTypes) as (keyof typeof locationTypes)[]),
			employmentType: oneOf(fd, 'employmentType', Object.keys(employmentTypes) as (keyof typeof employmentTypes)[]),
			startDate: yearMonth(fd, 'start'),
			endDate: fd.get('current') === 'on' ? null : yearMonth(fd, 'end'),
			description: str(fd, 'description', 3000)
		};
		if (!values.title || !values.organization || !values.startDate)
			return fail(400, { error: 'Title, organization and start year are required' });
		if (fd.get('current') !== 'on' && !values.endDate)
			return fail(400, { error: 'Choose the end year or mark the role as current' });
		// year-only dates span the whole year
		if (values.endDate && values.endDate.padEnd(7, '-12') < values.startDate.padEnd(7, '-01'))
			return fail(400, { error: 'End date is before start date' });

		const row = { ...values, title: values.title, organization: values.organization, startDate: values.startDate };
		if (id) {
			db.update(experiences)
				.set(row)
				.where(and(eq(experiences.id, id), eq(experiences.userId, target.id)))
				.run();
		} else {
			db.insert(experiences).values({ ...row, userId: target.id }).run();
		}
	},

	deleteExperience: async (event) => {
		const target = editable(event);
		const id = int(await event.request.formData(), 'id');
		if (id) db.delete(experiences).where(and(eq(experiences.id, id), eq(experiences.userId, target.id))).run();
	},

	addSkill: async (event) => {
		const target = editable(event);
		const name = str(await event.request.formData(), 'name', 40);
		if (!name) return;
		const count = await db.$count(skills, eq(skills.userId, target.id));
		if (count >= 50) return fail(400, { error: 'Too many skills' });
		db.insert(skills).values({ userId: target.id, name }).onConflictDoNothing().run();
	},

	removeSkill: async (event) => {
		const target = editable(event);
		const name = str(await event.request.formData(), 'name', 40);
		if (name) db.delete(skills).where(and(eq(skills.userId, target.id), eq(skills.name, name))).run();
	},

	connectTelegram: async ({ locals, params }) => {
		const me = locals.user!;
		if (me.nanoId !== params.id) error(403, 'Forbidden');
		const bot = getBotUsername();
		if (!bot) return fail(400, { error: 'Telegram bot is not available right now' });
		redirect(303, `https://t.me/${bot}?start=${createLinkToken(me.id)}`, { external: ['https://t.me'] });
	},

	changePassword: async ({ request, locals, params }) => {
		const me = locals.user!;
		if (me.nanoId !== params.id) error(403, 'Forbidden');
		const fd = await request.formData();
		const password = (fd.get('newPassword') as string | null) ?? '';
		if (!(await checkPassword((fd.get('currentPassword') as string | null) ?? '', me.passwordHash)))
			return fail(400, { error: 'Current password is wrong' });
		if (password.length < 8) return fail(400, { error: 'New password must be at least 8 characters' });
		if (password !== fd.get('newPasswordRepeat')) return fail(400, { error: "New passwords don't match" });
		update(me.id, { passwordHash: await hashPassword(password) });
		return { passwordChanged: true };
	},

	disconnectTelegram: async (event) => {
		const target = editable(event);
		update(target.id, { telegramId: null });
	},

	approve: (event) => {
		approveUser(adminOnly(event).id);
	},
	giveBadge: async (event) => {
		const target = adminOnly(event);
		const badgeId = int(await event.request.formData(), 'badgeId');
		if (badgeId) giveBadge(target.id, badgeId);
	},
	removeBadge: async (event) => {
		const target = adminOnly(event);
		const badgeId = int(await event.request.formData(), 'badgeId');
		if (badgeId) removeBadge(target.id, badgeId);
	},
	ban: (event) => {
		setBanned(adminOnly(event).id, true);
	},
	unban: (event) => {
		setBanned(adminOnly(event).id, false);
	}
};
