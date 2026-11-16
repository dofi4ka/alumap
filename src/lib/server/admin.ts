import { and, eq } from 'drizzle-orm';
import { db, events, users } from './db/index.ts';

export const approveUser = async (id: number) => {
	await db.update(users).set({ isApproved: true }).where(eq(users.id, id));
};

/** Admins cannot be banned (and cannot manage other admins at all). */
export const setBanned = async (id: number, isBanned: boolean) => {
	await db
		.update(users)
		.set({ isBanned })
		.where(and(eq(users.id, id), eq(users.isAdmin, false)));
};

export const publishEvent = async (id: number) => {
	await db.update(events).set({ status: 'published' }).where(eq(events.id, id));
};
