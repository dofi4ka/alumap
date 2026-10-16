import { and, eq } from 'drizzle-orm';
import { db, events, users } from './db/index.ts';

export const approveUser = (id: number) =>
	db.update(users).set({ isApproved: true }).where(eq(users.id, id)).run();

/** Admins cannot be banned (and cannot manage other admins at all). */
export const setBanned = (id: number, isBanned: boolean) =>
	db
		.update(users)
		.set({ isBanned })
		.where(and(eq(users.id, id), eq(users.isAdmin, false)))
		.run();

export const publishEvent = (id: number) =>
	db.update(events).set({ status: 'published' }).where(eq(events.id, id)).run();
