import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { eq, lt } from 'drizzle-orm';
import type { Cookies } from '@sveltejs/kit';
import { db, sessions, users } from './db/index.ts';

// Same as alumap-htmx/auth/passwords.go: bcrypt, cost 12, password truncated to 72 bytes
// (bcryptjs truncates UTF-8 bytes to 72 itself, exactly like the Go code does explicitly).
export const hashPassword = (password: string) => bcrypt.hash(password, 12);
export const checkPassword = (password: string, hash: string) => bcrypt.compare(password, hash);

export const sha256 = (s: string) => crypto.createHash('sha256').update(s).digest('hex');
export const randomToken = () => crypto.randomBytes(24).toString('base64url');

const SESSION_COOKIE = 'session';
const SESSION_TTL = 30 * 24 * 3600 * 1000;

export function createSession(cookies: Cookies, userId: number) {
	const token = randomToken();
	const expiresAt = new Date(Date.now() + SESSION_TTL);
	db.insert(sessions).values({ id: sha256(token), userId, expiresAt }).run();
	cookies.set(SESSION_COOKIE, token, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		expires: expiresAt
	});
}

export function getSessionUser(cookies: Cookies) {
	const token = cookies.get(SESSION_COOKIE);
	if (!token) return null;
	const row = db
		.select({ user: users, expiresAt: sessions.expiresAt })
		.from(sessions)
		.innerJoin(users, eq(users.id, sessions.userId))
		.where(eq(sessions.id, sha256(token)))
		.get();
	if (!row || row.expiresAt.getTime() < Date.now()) return null;
	return row.user;
}

export function destroySession(cookies: Cookies) {
	const token = cookies.get(SESSION_COOKIE);
	if (token) db.delete(sessions).where(eq(sessions.id, sha256(token))).run();
	cookies.delete(SESSION_COOKIE, { path: '/' });
	db.delete(sessions).where(lt(sessions.expiresAt, new Date())).run();
}

export const isAlumniEmail = (email: string) =>
	/@innopolis\.(university|ru)$/i.test(email.trim());
