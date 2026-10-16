const monthFmt = new Intl.DateTimeFormat('en', { month: 'short', year: 'numeric', timeZone: 'UTC' });

/** Month names for selects, index 0 = January */
export const monthNames = Array.from({ length: 12 }, (_, i) =>
	new Date(Date.UTC(2000, i, 1)).toLocaleDateString('en', { month: 'long', timeZone: 'UTC' })
);

/** Experience dates are "YYYY-MM" or just "YYYY" (month is optional, like on LinkedIn). */
export const formatMonth = (ym: string) =>
	ym.length === 4 ? ym : monthFmt.format(new Date(`${ym}-01T00:00:00Z`));

/** Duration between two experience dates (inclusive), end null = now. Without a month, start counts from January and end to December. */
export function formatDuration(start: string, end: string | null) {
	const [sy, sm = 1] = start.split('-').map(Number);
	const now = new Date();
	const [ey, em = 12] = end ? end.split('-').map(Number) : [now.getFullYear(), now.getMonth() + 1];
	const months = Math.max(1, (ey - sy) * 12 + (em - sm) + 1);
	const y = Math.floor(months / 12);
	const m = months % 12;
	return [y && `${y} yr${y > 1 ? 's' : ''}`, m && `${m} mo${m > 1 ? 's' : ''}`].filter(Boolean).join(' ');
}

/** "2026-05-23T11:00" (venue local time) -> "Sat, May 23, 2026 - 11:00" */
export function formatEventDate(s: string) {
	const d = new Date(`${s}:00Z`);
	const date = d.toLocaleDateString('en', {
		weekday: 'short',
		month: 'short',
		day: 'numeric',
		year: 'numeric',
		timeZone: 'UTC'
	});
	return `${date} - ${s.slice(11, 16)}`;
}

/**
 * Event times are stored as local time of the venue without timezone,
 * so "past" is decided with a day of slack instead of exact comparison.
 */
export const isPastEvent = (startsAt: string) =>
	new Date(`${startsAt}:00Z`).getTime() < Date.now() - 24 * 3600 * 1000;

export const formatCost = (cost: number | null) => (cost ? `${cost.toLocaleString('ru')} ₽` : 'Free');

export const locationTypes = { onsite: 'On-site', hybrid: 'Hybrid', remote: 'Remote' } as const;
export const employmentTypes = {
	'full-time': 'Full-time',
	'part-time': 'Part-time',
	contract: 'Contract',
	internship: 'Internship',
	freelance: 'Freelance',
	'self-employed': 'Self-employed'
} as const;
