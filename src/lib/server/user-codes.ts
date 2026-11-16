import crypto from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import { sha256 } from './auth.ts';
import { db, userCodes, type UserCode } from './db/index.ts';

export const CODE_TTL_MS = 15 * 60 * 1000;
export const CODE_MAX_ATTEMPTS = 5;
export const CODE_LENGTH = 6;

export type CodePurpose = 'password-reset' | 'sso-verify' | 'email-change';

export const randomCode = () => crypto.randomInt(0, 1_000_000).toString().padStart(CODE_LENGTH, '0');

/** Stores a fresh code for the user and returns it. Existing code of the same purpose is replaced. */
export async function issueUserCode(options: {
	userId: number;
	purpose: CodePurpose;
	email: string;
	graduationYear?: number | null;
}) {
	const code = randomCode();
	const values = {
		userId: options.userId,
		purpose: options.purpose,
		email: options.email,
		graduationYear: options.graduationYear ?? null,
		codeHash: sha256(code),
		attempts: 0,
		expiresAt: new Date(Date.now() + CODE_TTL_MS)
	};
	await db
		.insert(userCodes)
		.values(values)
		.onConflictDoUpdate({
			target: [userCodes.userId, userCodes.purpose],
			set: {
				email: values.email,
				graduationYear: values.graduationYear,
				codeHash: values.codeHash,
				attempts: 0,
				expiresAt: values.expiresAt
			}
		});
	return code;
}

export const findUserCode = async (userId: number, purpose: CodePurpose) =>
	(
		await db
			.select()
			.from(userCodes)
			.where(and(eq(userCodes.userId, userId), eq(userCodes.purpose, purpose)))
	)[0] ?? null;

export const deleteUserCode = async (userId: number, purpose: CodePurpose) => {
	await db.delete(userCodes).where(and(eq(userCodes.userId, userId), eq(userCodes.purpose, purpose)));
};

/** Normalizes a code typed or pasted into the six boxes. */
export const normalizeCode = (value: string | null) => (value ?? '').replace(/\D/g, '').slice(0, CODE_LENGTH);

export type CodeCheck = { ok: true; code: UserCode } | { ok: false; error: string };

/** Checks a code and counts a wrong attempt. Does not delete the code on success. */
export async function verifyUserCode(
	userId: number,
	purpose: CodePurpose,
	input: string | null
): Promise<CodeCheck> {
	const stored = await findUserCode(userId, purpose);
	if (!stored) return { ok: false, error: 'Request a new code' };
	if (stored.expiresAt.getTime() < Date.now())
		return { ok: false, error: 'The code has expired, request a new one' };
	if (stored.attempts >= CODE_MAX_ATTEMPTS)
		return { ok: false, error: 'Too many attempts, request a new code' };

	const code = normalizeCode(input);
	if (code.length !== CODE_LENGTH || sha256(code) !== stored.codeHash) {
		await db
			.update(userCodes)
			.set({ attempts: stored.attempts + 1 })
			.where(eq(userCodes.id, stored.id));
		return { ok: false, error: 'Wrong code' };
	}
	return { ok: true, code: stored };
}
