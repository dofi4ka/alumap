import { error, fail } from '@sveltejs/kit';
import { asc, desc, eq } from 'drizzle-orm';
import { approveUser, publishEvent, setBanned } from '#lib/server/admin.ts';
import { badges, db, events, projects, userBadges, users } from '#lib/server/db/index.ts';
import { deleteProject } from '#lib/server/projects.ts';
import { builtInSlugs, fetchIconSvg } from '#lib/server/badges.ts';
import { nanoid } from 'nanoid';
import { deleteEvent } from '#lib/server/events.ts';
import { int, oneOf, str } from '#lib/server/forms.ts';
import { getAboutPage, saveAboutPage } from '#lib/server/pages.ts';
import type { Actions, PageServerLoad } from './$types';

const userColumns = {
	id: users.id,
	nanoId: users.nanoId,
	firstName: users.firstName,
	lastName: users.lastName,
	email: users.email,
	ssoEmail: users.ssoEmail,
	avatarId: users.avatarId,
	graduationYear: users.graduationYear,
	isApproved: users.isApproved,
	isBanned: users.isBanned,
	isAdmin: users.isAdmin,
	createdAt: users.createdAt
};

export const load: PageServerLoad = async () => {
	const [allUsers, holderRows, badgeRows, pendingProjects, pendingEvents, about] = await Promise.all([
		db.select(userColumns).from(users).orderBy(desc(users.createdAt)),
		db
			.select({
				badgeId: userBadges.badgeId,
				id: users.id,
				nanoId: users.nanoId,
				firstName: users.firstName,
				lastName: users.lastName,
				avatarId: users.avatarId,
				headline: users.headline
			})
			.from(userBadges)
			.innerJoin(users, eq(users.id, userBadges.userId))
			.where(eq(userBadges.removed, false))
			.orderBy(asc(userBadges.grantedAt)),
		db
			.select({
				id: badges.id,
				slug: badges.slug,
				name: badges.name,
				description: badges.description,
				rarity: badges.rarity,
				svg: badges.svg
			})
			.from(badges)
			.orderBy(asc(badges.id)),
		db
			.select({
				id: projects.id,
				nanoId: projects.nanoId,
				title: projects.title,
				ownerFirstName: users.firstName,
				ownerLastName: users.lastName
			})
			.from(projects)
			.innerJoin(users, eq(users.id, projects.ownerId))
			.where(eq(projects.status, 'pending'))
			.orderBy(asc(projects.createdAt)),
		db
			.select({
				nanoId: events.nanoId,
				id: events.id,
				title: events.title,
				startsAt: events.startsAt,
				locationName: events.locationName,
				ownerFirstName: users.firstName,
				ownerLastName: users.lastName,
				ownerNanoId: users.nanoId
			})
			.from(events)
			.innerJoin(users, eq(users.id, events.ownerId))
			.where(eq(events.status, 'pending'))
			.orderBy(asc(events.createdAt)),
		getAboutPage()
	]);

	const holders = Map.groupBy(holderRows, (h) => h.badgeId);

	return {
		about,
		badges: badgeRows.map(({ slug, ...b }) => ({
			...b,
			builtIn: builtInSlugs.has(slug),
			holders: holders.get(b.id) ?? []
		})),
		pendingUsers: allUsers.filter((u) => !u.isApproved && !u.isBanned),
		users: allUsers.filter((u) => u.isApproved || u.isBanned),
		pendingProjects,
		pendingEvents
	};
};

async function id(request: Request) {
	const v = int(await request.formData(), 'id');
	if (!v) error(400, 'Missing id');
	return v;
}

export const actions: Actions = {
	/** Creates a badge, or updates one when `id` is set (keeping its icon unless a new one is picked). */
	saveBadge: async ({ request }) => {
		const fd = await request.formData();
		const badgeId = int(fd, 'id');
		const name = str(fd, 'name', 60);
		const description = str(fd, 'description', 200);
		const rarity = oneOf(fd, 'rarity', ['bronze', 'silver', 'gold'] as const);
		if (!name || !description || !rarity) return fail(400, { error: 'Fill in title, description and rarity' });

		// the server downloads the icon itself, so only real iconify icons get into the database
		const icon = str(fd, 'icon', 100);
		if (!icon && !badgeId) return fail(400, { error: 'Pick an icon' });
		const svg = icon ? await fetchIconSvg(icon) : undefined;
		if (svg === null) return fail(400, { error: 'Could not download the icon from iconify, try again' });

		if (badgeId) await db.update(badges).set({ name, description, rarity, svg }).where(eq(badges.id, badgeId));
		else await db.insert(badges).values({ slug: nanoid(12), name, description, rarity, svg: svg! });
	},
	deleteBadge: async ({ request }) => {
		const badge = (await db.select().from(badges).where(eq(badges.id, await id(request))))[0];
		if (!badge || builtInSlugs.has(badge.slug)) return fail(400, { error: 'Built-in badges cannot be deleted' });
		await db.delete(badges).where(eq(badges.id, badge.id));
	},
	approveUser: async ({ request }) => {
		await approveUser(await id(request));
	},
	ban: async ({ request }) => {
		await setBanned(await id(request), true);
	},
	unban: async ({ request }) => {
		await setBanned(await id(request), false);
	},
	publishEvent: async ({ request }) => {
		await publishEvent(await id(request));
	},
	publishProject: async ({ request }) => {
		await db.update(projects).set({ status: 'published' }).where(eq(projects.id, await id(request)));
	},
	/** like events, a rejected project is deleted */
	rejectProject: async ({ request }) => {
		const project = (await db.select().from(projects).where(eq(projects.id, await id(request))))[0];
		if (project) await deleteProject(project);
	},
	/** there is no "rejected" state: a rejected event is deleted */
	rejectEvent: async ({ request }) => {
		const event = (await db.select().from(events).where(eq(events.id, await id(request))))[0];
		if (event) await deleteEvent(event);
	},
	saveAbout: async ({ request }) => {
		const fd = await request.formData();
		const title = str(fd, 'title', 120);
		const content = str(fd, 'content', 20000);
		if (!title || !content) return fail(400, { error: 'Fill in title and content' });
		await saveAboutPage(title, content);
	}
};
