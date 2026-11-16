/** IU affiliation shown on profiles, derived from the verified Innopolis email and graduation year. */
export type IuStatus = 'student' | 'alumni' | 'friend';

export const MIN_GRADUATION_YEAR = 2014;
export const maxGraduationYear = () => new Date().getFullYear() + 4;
export const isValidGraduationYear = (year: number | null) =>
	year !== null && year >= MIN_GRADUATION_YEAR && year <= maxGraduationYear();

/**
 * A verified Innopolis email makes the user IU-affiliated. Until August 1 of the graduation
 * year they are a student, afterwards (or without a year) they are an alumnus.
 */
export function iuStatus(
	user: { ssoEmail: string | null; graduationYear: number | null },
	now = new Date()
): IuStatus {
	if (!user.ssoEmail) return 'friend';
	if (user.graduationYear === null) return 'alumni';
	const alumniFrom = Date.UTC(user.graduationYear, 7, 1);
	return now.getTime() >= alumniFrom ? 'alumni' : 'student';
}

export function iuStatusLabel(status: IuStatus, graduationYear: number | null) {
	const year = graduationYear ? ` ’${String(graduationYear).slice(2)}` : '';
	if (status === 'friend') return 'IU Friend';
	if (status === 'student') return `IU Student${year}`;
	return `IU Alumni${year}`;
}
