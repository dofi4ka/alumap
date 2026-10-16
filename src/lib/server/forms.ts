/** Trimmed string from form data, null when empty. */
export function str(fd: FormData, key: string, max = 200): string | null {
	const v = fd.get(key);
	if (typeof v !== 'string') return null;
	const t = v.trim().slice(0, max);
	return t === '' ? null : t;
}

export function int(fd: FormData, key: string): number | null {
	const v = str(fd, key, 20);
	if (v === null) return null;
	const n = Number(v);
	return Number.isInteger(n) ? n : null;
}

/** Location from CityPicker hidden inputs. */
export function location(fd: FormData) {
	const name = str(fd, 'locationName');
	const lat = Number(str(fd, 'locationLat', 30));
	const lng = Number(str(fd, 'locationLng', 30));
	if (!name || !Number.isFinite(lat) || !Number.isFinite(lng)) return null;
	return { locationName: name, locationLat: lat, locationLng: lng };
}

export const isDate = (s: string | null, pattern: RegExp) => s === null || pattern.test(s);

/** Experience date from `<prefix>Year` and optional `<prefix>Month` selects: "YYYY-MM", "YYYY" or null. */
export function yearMonth(fd: FormData, prefix: string): string | null {
	const year = int(fd, `${prefix}Year`);
	if (year === null || year < 1950 || year > new Date().getFullYear() + 10) return null;
	const month = int(fd, `${prefix}Month`);
	if (month === null || month < 1 || month > 12) return String(year);
	return `${year}-${String(month).padStart(2, '0')}`;
}
export const DAY = /^\d{4}-\d{2}-\d{2}$/;
export const DATETIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

/** Value from form if it is one of allowed options, null otherwise. */
export function oneOf<T extends string>(fd: FormData, key: string, options: readonly T[]): T | null {
	const v = fd.get(key);
	return options.includes(v as T) ? (v as T) : null;
}
