import { error, fail } from '@sveltejs/kit';
import { asc, desc, eq } from 'drizzle-orm';
import { approveUser, publishEvent, setBanned } from '#lib/server/admin.ts';
import { badges, db, events, projects, userBadges, users } from '#lib/server/db/index.ts';
import { deleteProject } from '#lib/server/projects.ts';
import { builtInSlugs, fetchIconSvg } from '#lib/server/badges.ts';
import { nanoid } from 'nanoid';
import { deleteEvent } from '#lib/server/events.ts';
import { int, oneOf, str } from '#lib/server/forms.ts';
import type { Actions, PageServerLoad } from './$types';

const userColumns = {
	id: users.id,
	nanoId: users.nanoId,
	firstName: users.firstName,
	lastName: users.lastName,
	email: users.email,
	avatarId: users.avatarId,
	graduationYear: users.graduationYear,
	isApproved: users.isApproved,
	isBanned: users.isBanned,
	isAdmin: users.isAdmin,
	createdAt: users.createdAt
};

export const load: PageServerLoad = () => {
	const allUsers = db.select(userColumns).from(users).orderBy(desc(users.createdAt)).all();
	const holders = Map.groupBy(
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
			.orderBy(asc(userBadges.grantedAt))
			.all(),
		(h) => h.badgeId
	);
	return {
		badges: db
			.select({
				id: badges.id,
				slug: badges.slug,
				name: badges.name,
				description: badges.description,
				rarity: badges.rarity,
				svg: badges.svg
			})
			.from(badges)
			.orderBy(asc(badges.id))
			.all()
			.map(({ slug, ...b }) => ({ ...b, builtIn: builtInSlugs.has(slug), holders: holders.get(b.id) ?? [] })),
		pendingUsers: allUsers.filter((u) => !u.isApproved && !u.isBanned),
		users: allUsers.filter((u) => u.isApproved || u.isBanned),
		pendingProjects: db
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
			.orderBy(asc(projects.createdAt))
			.all(),
		pendingEvents: db
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
			.orderBy(asc(events.createdAt))
			.all()
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

		if (badgeId) db.update(badges).set({ name, description, rarity, svg }).where(eq(badges.id, badgeId)).run();
		else db.insert(badges).values({ slug: nanoid(12), name, description, rarity, svg: svg! }).run();
	},
	deleteBadge: async ({ request }) => {
		const badge = db.select().from(badges).where(eq(badges.id, await id(request))).get();
		if (!badge || builtInSlugs.has(badge.slug)) return fail(400, { error: 'Built-in badges cannot be deleted' });
		db.delete(badges).where(eq(badges.id, badge.id)).run();
	},
	approveUser: async ({ request }) => {
		approveUser(await id(request));
	},
	ban: async ({ request }) => {
		setBanned(await id(request), true);
	},
	unban: async ({ request }) => {
		setBanned(await id(request), false);
	},
	publishEvent: async ({ request }) => {
		publishEvent(await id(request));
	},
	publishProject: async ({ request }) => {
		db.update(projects).set({ status: 'published' }).where(eq(projects.id, await id(request))).run();
	},
	/** like events, a rejected project is deleted */
	rejectProject: async ({ request }) => {
		const project = db.select().from(projects).where(eq(projects.id, await id(request))).get();
		if (project) await deleteProject(project);
	},
	/** there is no "rejected" state: a rejected event is deleted */
	rejectEvent: async ({ request }) => {
		const event = db.select().from(events).where(eq(events.id, await id(request))).get();
		if (event) await deleteEvent(event);
	}
};
