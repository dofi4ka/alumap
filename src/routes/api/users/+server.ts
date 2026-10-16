import { json } from '@sveltejs/kit';
import { and, eq, like, or, sql } from 'drizzle-orm';
import { db, users } from '#lib/server/db/index.ts';
import type { RequestHandler } from './$types';

/** User search by name, for pickers. Only approved, not banned users. */
export const GET: RequestHandler = ({ url }) => {
	const q = (url.searchParams.get('q') ?? '').trim().slice(0, 60);
	if (q.length < 2) return json([]);
	const pattern = `%${q.replace(/[%_]/g, '')}%`;
	return json(
		db
			.select({ id: users.id, nanoId: users.nanoId, firstName: users.firstName, lastName: users.lastName, avatarId: users.avatarId })
			.from(users)
			.where(
				and(
					eq(users.isApproved, true),
					eq(users.isBanned, false),
					or(like(users.firstName, pattern), like(users.lastName, pattern), like(sql`${users.firstName} || ' ' || ${users.lastName}`, pattern))
				)
			)
			.limit(10)
			.all()
	);
};
