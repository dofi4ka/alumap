export type City = { name: string; lat: number; lng: number };

export type UserLocationFields = {
	locationName: string | null;
	locationLat: number | null;
	locationLng: number | null;
	temporaryLocationName: string | null;
	temporaryLocationLat: number | null;
	temporaryLocationLng: number | null;
	temporaryLocationExpiresAt: Date | null;
};

export type EffectiveLocation = City & {
	temporary: boolean;
	/** Set when the location is temporary */
	expiresAt: Date | null;
};

/** Cities within this distance also trigger notifications, with a "(near …)" note. */
export const NEAR_CITY_KM = 150;

/** Days/months a temporary location may last. */
export const MAX_TEMPORARY_DAYS = 366;

const EARTH_RADIUS_KM = 6371;

const rad = (deg: number) => (deg * Math.PI) / 180;

/** Great-circle distance in kilometers. */
export function distanceKm(a: City, b: City) {
	const dLat = rad(b.lat - a.lat);
	const dLng = rad(b.lng - a.lng);
	const h =
		Math.sin(dLat / 2) ** 2 +
		Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
	return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

export const normalizeCityName = (name: string) =>
	name
		.normalize('NFD')
		.replace(/\p{Diacritic}/gu, '')
		.trim()
		.toLowerCase();

export const isTemporaryActive = (
	u: Pick<UserLocationFields, 'temporaryLocationExpiresAt'>
) => !!u.temporaryLocationExpiresAt && u.temporaryLocationExpiresAt.getTime() > Date.now();

/** The location a user is actually shown at: temporary location shadows the main one while active. */
export function effectiveLocation(u: UserLocationFields): EffectiveLocation | null {
	if (
		isTemporaryActive(u) &&
		u.temporaryLocationName &&
		u.temporaryLocationLat !== null &&
		u.temporaryLocationLng !== null
	) {
		return {
			name: u.temporaryLocationName,
			lat: u.temporaryLocationLat,
			lng: u.temporaryLocationLng,
			temporary: true,
			expiresAt: u.temporaryLocationExpiresAt
		};
	}
	if (u.locationName && u.locationLat !== null && u.locationLng !== null) {
		return {
			name: u.locationName,
			lat: u.locationLat,
			lng: u.locationLng,
			temporary: false,
			expiresAt: null
		};
	}
	return null;
}

export const homeLocation = (u: UserLocationFields): City | null =>
	u.locationName && u.locationLat !== null && u.locationLng !== null
		? { name: u.locationName, lat: u.locationLat, lng: u.locationLng }
		: null;

export const temporaryLocation = (u: UserLocationFields): City | null =>
	isTemporaryActive(u) &&
	u.temporaryLocationName &&
	u.temporaryLocationLat !== null &&
	u.temporaryLocationLng !== null
		? {
				name: u.temporaryLocationName,
				lat: u.temporaryLocationLat,
				lng: u.temporaryLocationLng
			}
		: null;

export const DURATION_RE = /^(\d{1,3})\s*([dwm])$/i;

const UNIT_DAYS = { d: 1, w: 7, m: 30 } as const;
const UNIT_NAMES = { d: 'day', w: 'week', m: 'month' } as const;

/**
 * Parses a duration like `14d`, `3w` or `2m`. Returns null for invalid or too long values.
 * Months are calendar months: "2m" means the same day two months later.
 */
export function parseDuration(input: string): { days: number; label: string } | null {
	const m = DURATION_RE.exec(input.trim());
	if (!m) return null;
	const amount = Number(m[1]);
	const unit = m[2].toLowerCase() as keyof typeof UNIT_DAYS;
	if (!Number.isInteger(amount) || amount < 1) return null;
	const days = amount * UNIT_DAYS[unit];
	if (days > MAX_TEMPORARY_DAYS) return null;
	return {
		days,
		label: `${amount} ${UNIT_NAMES[unit]}${amount === 1 ? '' : 's'}`
	};
}

/** End date for a duration input; calendar months are handled as real months. */
export function durationExpiresAt(input: string, from = new Date()): Date | null {
	const parsed = parseDuration(input);
	if (!parsed) return null;
	const m = DURATION_RE.exec(input.trim())!;
	const amount = Number(m[1]);
	const unit = m[2].toLowerCase();
	const result = new Date(from);
	if (unit === 'm') {
		// Calendar month, clamped to the last day: Jan 31 + 1m = Feb 28/29, not Mar 3.
		const day = result.getDate();
		result.setDate(1);
		result.setMonth(result.getMonth() + amount);
		const lastDay = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate();
		result.setDate(Math.min(day, lastDay));
	} else {
		result.setDate(result.getDate() + parsed.days);
	}
	return result;
}
