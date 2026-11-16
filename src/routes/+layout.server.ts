import { and, eq, isNull } from 'drizzle-orm';
import { db, notifications } from '#lib/server/db/index.ts';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
	const u = locals.user;
	return {
		me: u && {
			id: u.id,
			nanoId: u.nanoId,
			firstName: u.firstName,
			lastName: u.lastName,
			avatarId: u.avatarId,
			isAdmin: u.isAdmin,
			isApproved: u.isApproved,
			isBanned: u.isBanned
		},
		unreadNotifications: u
			? await db.$count(
					notifications,
					and(eq(notifications.userId, u.id), isNull(notifications.readAt))
				)
			: 0
	};
};
