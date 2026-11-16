import { error, fail, redirect } from '@sveltejs/kit';
import { and, asc, desc, eq, inArray, ne, sql } from 'drizzle-orm';
import { approveUser, setBanned } from '#lib/server/admin.ts';
import { checkPassword, hashPassword } from '#lib/server/auth.ts';
import { isAlumniEmail } from '#lib/emails.ts';
import {
	badges,
	db,
	experiences,
	followedCities,
	referralCopies,
	referrals,
	skills,
	socialLinks,
	userBadges,
	users,
	type User
} from '#lib/server/db/index.ts';
import { badgeProgress, giveBadge, removeBadge } from '#lib/server/badges.ts';
import { sendVerificationCode } from '#lib/server/email.ts';
import { DAY, int, isDate, location, oneOf, str, yearMonth } from '#lib/server/forms.ts';
import { employmentTypes, locationTypes } from '#lib/format.ts';
import { effectiveLocation, homeLocation, temporaryLocation } from '#lib/server/geo.ts';
import { deleteImage, saveImage } from '#lib/server/images.ts';
import {
	clearTemporaryLocation,
	pruneExpiredTemporary,
	setTemporaryLocation,
	updateHomeLocation
} from '#lib/server/locations.ts';
import { isValidGraduationYear, iuStatus, maxGraduationYear } from '#lib/iu-status.ts';
import { normalizeUrl } from '#lib/socials.ts';
import { createLinkToken, getBotUsername } from '#lib/server/telegram.ts';
import {
	deleteUserCode,
	findUserCode,
	issueUserCode,
	verifyUserCode
} from '#lib/server/user-codes.ts';
import type { Actions, PageServerLoad, RequestEvent } from './$types';

/** All badges, earned first (gold first), each with the user's progress where it is countable. */
async function userBadgeList(userId: number) {
	const progress = await badgeProgress(userId);
	return (
		await db
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
	).map((b) => ({ ...b, progress: progress[b.slug] ?? null }));
}

async function getTarget(id: string) {
	const user = (await db.select().from(users).where(eq(users.nanoId, id)))[0];
	if (!user) error(404, 'User not found');
	return user;
}

export const load: PageServerLoad = async ({ params, locals }) => {
	const me = locals.user!;
	const target = await getTarget(params.id);
	const isSelf = target.id === me.id;
	if (!isSelf && !me.isAdmin && (!target.isApproved || target.isBanned))
		error(404, 'User not found');

	const u = await pruneExpiredTemporary(target);
	// private contact details only for the owner and admins
	const canSeePrivate = isSelf || me.isAdmin;

	const [userExperiences, badgeList, skillRows, socialRows, referralRows, followRows] = await Promise.all([
		db
			.select()
			.from(experiences)
			.where(eq(experiences.userId, u.id))
			.orderBy(sql`${experiences.endDate} is not null`, desc(experiences.endDate), desc(experiences.startDate)),
		userBadgeList(u.id),
		db.select({ name: skills.name }).from(skills).where(eq(skills.userId, u.id)).orderBy(asc(skills.name)),
		db.select({ url: socialLinks.url }).from(socialLinks).where(eq(socialLinks.userId, u.id)).orderBy(asc(socialLinks.id)),
		db
			.select({ id: referrals.id, company: referrals.company, url: referrals.url })
			.from(referrals)
			.where(eq(referrals.userId, u.id))
			.orderBy(asc(referrals.id)),
		db
			.select()
			.from(followedCities)
			.where(eq(followedCities.userId, u.id))
			.orderBy(desc(followedCities.enabled), asc(followedCities.createdAt))
	]);

	const copies =
		referralRows.length > 0
			? await db
					.select({ referralId: referralCopies.referralId, count: sql<number>`count(*)::int` })
					.from(referralCopies)
					.where(
						and(
							inArray(referralCopies.referralId, referralRows.map((r) => r.id)),
							// never count the profile owner's own copies
							ne(referralCopies.userId, u.id)
						)
					)
					.groupBy(referralCopies.referralId)
			: [];
	const copiesByReferral = new Map(copies.map((c) => [c.referralId, Number(c.count)]));
	const effective = effectiveLocation(u);
	const temp = temporaryLocation(u);

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
			socialLinks: socialRows.map((r) => r.url),
			referrals: referralRows.map((r) => ({
				id: r.id,
				company: r.company,
				// The link is revealed only by the Copy action, never in the page data.
				url: isSelf ? r.url : null,
				copies: copiesByReferral.get(r.id) ?? 0
			})),
			status: iuStatus(u),
			ssoEmail: canSeePrivate ? u.ssoEmail : null,
			location: effective,
			homeLocation: homeLocation(u),
			temporaryLocation: temp && u.temporaryLocationExpiresAt
				? { ...temp, expiresAt: u.temporaryLocationExpiresAt }
				: null,
			// private stuff only for the owner and admins
			email: canSeePrivate ? u.email : null,
			isApproved: u.isApproved,
			isBanned: u.isBanned,
			isAdmin: u.isAdmin
		},
		experiences: userExperiences,
		badges: badgeList,
		skills: skillRows.map((s) => s.name),
		// Followed cities are a private setting, not part of the public profile data.
		follows: isSelf
			? followRows.map((f) => ({
					id: f.id,
					name: f.name,
					lat: f.lat,
					lng: f.lng,
					source: f.source,
					enabled: f.enabled
				}))
			: [],
		isSelf,
		canEdit: isSelf || me.isAdmin,
		viewerIsAdmin: me.isAdmin,
		botEnabled: !!getBotUsername()
	};
};

/** Only the owner can manage their own notification settings. */
async function selfOnly({ params, locals }: RequestEvent): Promise<User> {
	const me = locals.user!;
	if (me.nanoId !== params.id) error(403, 'Forbidden');
	return me;
}

/** Resolves the edited user and checks that the current user may edit them. */
async function editable({ params, locals }: RequestEvent): Promise<User> {
	const me = locals.user!;
	const target = await getTarget(params.id);
	if (target.id !== me.id && !me.isAdmin) error(403, 'Forbidden');
	return target;
}

async function adminOnly({ params, locals }: RequestEvent): Promise<User> {
	if (!locals.user!.isAdmin) error(403, 'Forbidden');
	return getTarget(params.id);
}

const update = async (id: number, values: Partial<User>) => {
	await db.update(users).set(values).where(eq(users.id, id));
};

/** Validates social links: http(s), no duplicates, at most 10. */
function parseSocialLinks(fd: FormData): { urls: string[]; error?: string } {
	const urls: string[] = [];
	for (const raw of fd.getAll('social')) {
		if (typeof raw !== 'string' || !raw.trim()) continue;
		if (urls.length >= 10) return { urls, error: 'You can add up to 10 links' };
		const url = normalizeUrl(raw.trim())!;
		if (url.length > 300) return { urls, error: 'A link is too long' };
		let parsed: URL;
		try {
			parsed = new URL(url);
		} catch {
			return { urls, error: `"${raw}" is not a valid link` };
		}
		if (!/^https?:$/.test(parsed.protocol))
			return { urls, error: 'Only http(s) links are supported' };
		if (!urls.includes(url)) urls.push(url);
	}
	return { urls };
}

async function replaceSocialLinks(userId: number, urls: string[]) {
	await db.transaction(async (tx) => {
		await tx.delete(socialLinks).where(eq(socialLinks.userId, userId));
		if (urls.length) await tx.insert(socialLinks).values(urls.map((url) => ({ userId, url })));
	});
}

const referralUrl = (raw: string | null) => {
	if (!raw) return null;
	const url = normalizeUrl(raw);
	if (!url || url.length > 500) return null;
	try {
		const parsed = new URL(url);
		return /^https?:$/.test(parsed.protocol) ? url : null;
	} catch {
		return null;
	}
};

export const actions: Actions = {
	basic: async (event) => {
		const target = await editable(event);
		const fd = await event.request.formData();
		const firstName = str(fd, 'firstName', 60);
		const lastName = str(fd, 'lastName', 60);
		const birthday = str(fd, 'birthday', 10);
		if (!firstName || !lastName) return fail(400, { error: 'Name is required' });
		if (!isDate(birthday, DAY)) return fail(400, { error: 'Invalid birthday' });

		let graduationYear = target.graduationYear;
		// IU alumni can change their year; IU friends stay friends (unless an admin decides otherwise)
		if (target.ssoEmail || event.locals.user!.isAdmin) {
			graduationYear = int(fd, 'graduationYear');
			if (graduationYear !== null && !isValidGraduationYear(graduationYear))
				return fail(400, { error: `Graduation year must be between 2014 and ${maxGraduationYear()}` });
		}

		const socialsEdited = fd.get('socialsEdited') === '1';
		const socials = socialsEdited ? parseSocialLinks(fd) : null;
		if (socials?.error) return fail(400, { error: socials.error });

		const loc = location(fd);
		const city = loc ? { name: loc.locationName, lat: loc.locationLat, lng: loc.locationLng } : null;
		await update(target.id, {
			firstName,
			lastName,
			graduationYear,
			birthday,
			headline: str(fd, 'headline', 120)
		});
		if (socials) await replaceSocialLinks(target.id, socials.urls);
		await updateHomeLocation({ ...target, firstName, lastName }, city);
	},

	about: async (event) => {
		const target = await editable(event);
		await update(target.id, { bio: str(await event.request.formData(), 'bio', 3000) });
	},

	avatar: async (event) => {
		const target = await editable(event);
		const fd = await event.request.formData();
		try {
			const avatarId = await saveImage(fd.get('avatar'), 'avatar');
			if (!avatarId) return fail(400, { error: 'Choose an image' });
			await update(target.id, { avatarId });
			await deleteImage(target.avatarId);
		} catch (e) {
			return fail(400, { error: (e as Error).message });
		}
	},

	removeAvatar: async (event) => {
		const target = await editable(event);
		await update(target.id, { avatarId: null });
		await deleteImage(target.avatarId);
	},

	saveExperience: async (event) => {
		const target = await editable(event);
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
			await db
				.update(experiences)
				.set(row)
				.where(and(eq(experiences.id, id), eq(experiences.userId, target.id)));
		} else {
			await db.insert(experiences).values({ ...row, userId: target.id });
		}
	},

	deleteExperience: async (event) => {
		const target = await editable(event);
		const id = int(await event.request.formData(), 'id');
		if (id) await db.delete(experiences).where(and(eq(experiences.id, id), eq(experiences.userId, target.id)));
	},

	addSkill: async (event) => {
		const target = await editable(event);
		const name = str(await event.request.formData(), 'name', 40);
		if (!name) return;
		const count = await db.$count(skills, eq(skills.userId, target.id));
		if (count >= 50) return fail(400, { error: 'Too many skills' });
		await db.insert(skills).values({ userId: target.id, name }).onConflictDoNothing();
	},

	removeSkill: async (event) => {
		const target = await editable(event);
		const name = str(await event.request.formData(), 'name', 40);
		if (name) await db.delete(skills).where(and(eq(skills.userId, target.id), eq(skills.name, name)));
	},

	saveReferral: async (event) => {
		const target = await editable(event);
		const fd = await event.request.formData();
		const id = int(fd, 'id');
		const company = str(fd, 'company', 80);
		const url = referralUrl(str(fd, 'url', 500));
		if (!company || !url) return fail(400, { error: 'Enter a company and a valid http(s) link' });
		if (id) {
			await db
				.update(referrals)
				.set({ company, url })
				.where(and(eq(referrals.id, id), eq(referrals.userId, target.id)));
		} else {
			const count = await db.$count(referrals, eq(referrals.userId, target.id));
			if (count >= 10) return fail(400, { error: 'You can add up to 10 referrals' });
			await db.insert(referrals).values({ userId: target.id, company, url });
		}
	},

	deleteReferral: async (event) => {
		const target = await editable(event);
		const id = int(await event.request.formData(), 'id');
		if (id) {
			await db.delete(referrals).where(and(eq(referrals.id, id), eq(referrals.userId, target.id)));
		}
	},

	/** Reveals one referral link to a visitor and records the unique copy. */
	copyReferral: async (event) => {
		const id = int(await event.request.formData(), 'id');
		if (!id) return fail(400, { error: 'Missing referral' });
		const referral = (await db.select().from(referrals).where(eq(referrals.id, id)))[0];
		if (!referral) return fail(404, { error: 'This referral no longer exists' });
		// the owner copying their own link should not inflate the unique-copy count
		if (referral.userId !== event.locals.user!.id)
			await db
				.insert(referralCopies)
				.values({ referralId: referral.id, userId: event.locals.user!.id })
				.onConflictDoNothing();
		return { url: referral.url };
	},

	temporaryLocation: async (event) => {
		const target = await editable(event);
		const fd = await event.request.formData();
		const loc = location(fd);
		if (!loc) return fail(400, { error: 'Pick a city from the list' });
		const duration = str(fd, 'duration', 10) ?? '';
		const result = await setTemporaryLocation(
			target.id,
			{ name: loc.locationName, lat: loc.locationLat, lng: loc.locationLng },
			duration
		);
		if (!result.ok) return fail(400, { error: result.error });
	},

	clearTemporaryLocation: async (event) => {
		const target = await editable(event);
		await clearTemporaryLocation(target.id);
	},

	addFollowCity: async (event) => {
		const me = await selfOnly(event);
		const loc = location(await event.request.formData());
		if (!loc) return fail(400, { error: 'Pick a city from the list' });
		const count = await db.$count(followedCities, eq(followedCities.userId, me.id));
		if (count >= 20) return fail(400, { error: 'You can follow up to 20 cities' });
		await db
			.insert(followedCities)
			.values({
				userId: me.id,
				name: loc.locationName,
				lat: loc.locationLat,
				lng: loc.locationLng,
				source: 'manual',
				enabled: true
			})
			.onConflictDoUpdate({
				target: [followedCities.userId, followedCities.lat, followedCities.lng],
				set: { enabled: true }
			});
	},

	toggleFollowCity: async (event) => {
		const me = await selfOnly(event);
		const id = int(await event.request.formData(), 'id');
		if (!id) return;
		const row = (
			await db
				.select()
				.from(followedCities)
				.where(and(eq(followedCities.id, id), eq(followedCities.userId, me.id)))
		)[0];
		if (!row) return;
		await db
			.update(followedCities)
			.set({ enabled: !row.enabled })
			.where(eq(followedCities.id, row.id));
	},

	removeFollowCity: async (event) => {
		const me = await selfOnly(event);
		const id = int(await event.request.formData(), 'id');
		if (id)
			await db
				.delete(followedCities)
				.where(and(eq(followedCities.id, id), eq(followedCities.userId, me.id)));
	},

	changeEmail: async ({ request, locals, params }) => {
		const me = locals.user!;
		if (me.nanoId !== params.id) error(403, 'Forbidden');
		const fd = await request.formData();
		const email = str(fd, 'email')?.toLowerCase() ?? '';
		if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))
			return fail(400, { error: 'Enter a valid email', step: 'email' });
		if (isAlumniEmail(email))
			return fail(400, {
				error: 'Use a personal email here. Your Innopolis email is verified separately.',
				step: 'email'
			});
		if (email === me.email) return fail(400, { error: 'This is already your main email', step: 'email' });
		const taken = (await db.select({ id: users.id }).from(users).where(eq(users.email, email)))[0];
		if (taken) return fail(400, { error: 'This email is already used by another account', step: 'email' });

		const code = await issueUserCode({ userId: me.id, purpose: 'email-change', email });
		try {
			await sendVerificationCode(email, code, 'email-change');
		} catch (e) {
			console.error('[email change]', e);
			return fail(400, { error: 'Could not send the email, try again later', step: 'email' });
		}
		return { step: 'verify' as const, email };
	},

	resendEmailCode: async ({ locals, params }) => {
		const me = locals.user!;
		if (me.nanoId !== params.id) error(403, 'Forbidden');
		const stored = await findUserCode(me.id, 'email-change');
		if (!stored) return fail(400, { error: 'Enter the new email again', step: 'email' });
		const code = await issueUserCode({
			userId: me.id,
			purpose: 'email-change',
			email: stored.email
		});
		try {
			await sendVerificationCode(stored.email, code, 'email-change');
		} catch (e) {
			console.error('[email change]', e);
			return fail(400, {
				error: 'Could not send the email, try again later',
				step: 'verify',
				email: stored.email
			});
		}
		return { step: 'verify' as const, email: stored.email, resent: true };
	},

	verifyEmailCode: async ({ request, locals, params }) => {
		const me = locals.user!;
		if (me.nanoId !== params.id) error(403, 'Forbidden');
		const fd = await request.formData();
		const stored = await findUserCode(me.id, 'email-change');
		const check = await verifyUserCode(me.id, 'email-change', str(fd, 'code', 10));
		if (!check.ok)
			return fail(400, {
				error: check.error,
				step: 'verify',
				email: stored?.email
			});

		const email = check.code.email;
		const taken = (
			await db
				.select({ id: users.id })
				.from(users)
				.where(and(eq(users.email, email), ne(users.id, me.id)))
		)[0];
		if (taken)
			return fail(400, {
				error: 'This email is already used by another account',
				step: 'verify',
				email
			});
		try {
			await db.update(users).set({ email }).where(eq(users.id, me.id));
		} catch (e) {
			console.error('[email change]', e);
			return fail(400, {
				error: 'This email is already used by another account',
				step: 'verify',
				email
			});
		}
		await deleteUserCode(me.id, 'email-change');
		return { emailChanged: true };
	},

	connectTelegram: async ({ locals, params }) => {
		const me = locals.user!;
		if (me.nanoId !== params.id) error(403, 'Forbidden');
		const bot = getBotUsername();
		if (!bot) return fail(400, { error: 'Telegram bot is not available right now' });
		const token = await createLinkToken(me.id);
		redirect(303, `https://t.me/${bot}?start=${token}`, { external: ['https://t.me'] });
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
		await update(me.id, { passwordHash: await hashPassword(password) });
		return { passwordChanged: true };
	},

	disconnectTelegram: async (event) => {
		const target = await editable(event);
		await update(target.id, { telegramId: null, telegramUsername: null });
	},

	approve: async (event) => {
		await approveUser((await adminOnly(event)).id);
	},
	giveBadge: async (event) => {
		const target = await adminOnly(event);
		const badgeId = int(await event.request.formData(), 'badgeId');
		if (badgeId) await giveBadge(target.id, badgeId);
	},
	removeBadge: async (event) => {
		const target = await adminOnly(event);
		const badgeId = int(await event.request.formData(), 'badgeId');
		if (badgeId) await removeBadge(target.id, badgeId);
	},
	ban: async (event) => {
		await setBanned((await adminOnly(event)).id, true);
	},
	unban: async (event) => {
		await setBanned((await adminOnly(event)).id, false);
	}
};
