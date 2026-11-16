import { and, eq } from 'drizzle-orm';
import { db, events, users } from './db/index.ts';
import { notifyAppearance, notifyEventPublished } from './notifications.ts';

export const approveUser = async (id: number) => {
	const user = (await db.select().from(users).where(eq(users.id, id)))[0];
	if (!user) return;
	const [approved] = await db
		.update(users)
		.set({ isApproved: true })
		.where(eq(users.id, id))
		.returning();
	// Only the first approval is a new appearance in a city.
	if (approved && !user.isApproved) await notifyAppearance(approved);
};

/** Admins cannot be banned (and cannot manage other admins at all). */
export const setBanned = async (id: number, isBanned: boolean) => {
	await db
		.update(users)
		.set({ isBanned })
		.where(and(eq(users.id, id), eq(users.isAdmin, false)));
};

export const publishEvent = async (id: number) => {
	const event = (await db.select().from(events).where(eq(events.id, id)))[0];
	if (!event || event.status === 'published') return;
	const [published] = await db
		.update(events)
		.set({ status: 'published' })
		.where(eq(events.id, id))
		.returning();
	if (published) await notifyEventPublished(published);
};
