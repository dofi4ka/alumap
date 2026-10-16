import { error, redirect } from '@sveltejs/kit';
import type { Handle, ServerInit } from '@sveltejs/kit/hooks';
import { getSessionUser } from '#lib/server/auth.ts';
import { startBot } from '#lib/server/telegram.ts';
import { grantAutoBadges, startBadgeGranting } from '#lib/server/badges.ts';

export const init: ServerInit = () => {
	startBadgeGranting();
	startBot();
};

const publicPaths = ['/login', '/register', '/api/telegram-auth'];
/** Paths available to registered, but not yet approved users */
const unapprovedPaths = ['/logout', '/profile', '/api/cities', '/uploads/', '/banned'];

const startsWithAny = (path: string, prefixes: string[]) =>
	prefixes.some((p) => path === p || path.startsWith(p.endsWith('/') ? p : p + '/'));

export const handle: Handle = async ({ event, resolve }) => {
	const user = getSessionUser(event.cookies);
	event.locals.user = user;
	const path = event.url.pathname;

	if (startsWithAny(path, publicPaths)) {
		if (user && path !== '/api/telegram-auth') redirect(303, '/');
		return resolve(event);
	}

	if (!user) {
		if (path.startsWith('/api/') || path.startsWith('/uploads/')) error(401, 'Unauthorized');
		redirect(303, '/login');
	}

	if (user.isBanned) {
		if (path === '/banned' || path === '/logout') return resolve(event);
		redirect(303, '/banned');
	}

	if (!user.isApproved) {
		const ownProfile = startsWithAny(path, [`/u/${user.nanoId}`]);
		if (!ownProfile && !startsWithAny(path, unapprovedPaths)) redirect(303, '/profile');
	}

	if (path.startsWith('/admin') && !user.isAdmin) error(403, 'Admins only');

	const response = await resolve(event);
	// everything that may earn a badge (profile edits, attendance, events) is a form post
	if (event.request.method === 'POST') grantAutoBadges();
	return response;
};
