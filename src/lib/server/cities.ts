import fs from 'node:fs';
import path from 'node:path';

export type City = {
	name: string;
	admin: string;
	country: string;
	lat: number;
	lng: number;
	population: number;
	priority: number;
};

const extraCities: City[] = [
	{
		name: 'Innopolis',
		admin: 'Tatarstan',
		country: 'Russia',
		lat: 55.753686,
		lng: 48.743306,
		population: 5_000,
		priority: 5_000_000
	}
];

export const normalize = (s: string) =>
	s
		.normalize('NFD')
		.replace(/\p{Diacritic}/gu, '')
		.toLowerCase()
		.trim();

function parseCsvLine(line: string): string[] {
	const out: string[] = [];
	let cur = '';
	let quoted = false;
	for (let i = 0; i < line.length; i++) {
		const ch = line[i];
		if (quoted) {
			if (ch === '"' && line[i + 1] === '"') (cur += '"'), i++;
			else if (ch === '"') quoted = false;
			else cur += ch;
		} else if (ch === '"') quoted = true;
		else if (ch === ',') out.push(cur), (cur = '');
		else cur += ch;
	}
	out.push(cur);
	return out;
}

const capitalWeight: Record<string, number> = { primary: 5, admin: 3, minor: 2 };

function load(): City[] {
	const [header, ...lines] = fs
		.readFileSync(path.resolve('assets/cities.csv'), 'utf8')
		.split('\n')
		.filter(Boolean);
	const cols = parseCsvLine(header);
	const c = (name: string) => cols.indexOf(name);
	const [iName, iLat, iLng, iCountry, iAdmin, iCapital, iPop] = [
		c('city'), c('lat'), c('lng'), c('country'), c('admin_name'), c('capital'), c('population')
	];

	const cities: City[] = [...extraCities];
	for (const line of lines) {
		const r = parseCsvLine(line);
		const lat = parseFloat(r[iLat]);
		const lng = parseFloat(r[iLng]);
		if (Number.isNaN(lat) || Number.isNaN(lng)) continue;
		const pop = parseInt(r[iPop]) || 0;
		cities.push({
			name: r[iName],
			admin: r[iAdmin],
			country: r[iCountry],
			lat,
			lng,
			population: pop,
			priority: pop * (capitalWeight[r[iCapital]?.toLowerCase()] ?? 1)
		});
	}
	return cities.sort((a, b) => b.priority - a.priority);
}

const cities = load();
const keys = cities.map((c) => normalize(c.name));
const countryKeys = cities.map((c) => normalize(c.country));

/** City indices sorted by normalized name: prefix lookups become a binary search. */
const sorted = keys.map((_, i) => i).sort((a, b) => (keys[a] < keys[b] ? -1 : keys[a] > keys[b] ? 1 : a - b));

function lowerBound(prefix: string) {
	let lo = 0;
	let hi = sorted.length;
	while (lo < hi) {
		const mid = (lo + hi) >> 1;
		if (keys[sorted[mid]] < prefix) lo = mid + 1;
		else hi = mid;
	}
	return lo;
}

/** Search "city" or "city, country". Prefix matches first, then substring matches; both by priority. */
export function searchCities(query: string, limit = 10): City[] {
	const [namePart, countryPart = ''] = query.split(',').map(normalize);
	if (!namePart) return [];
	const countryOk = (i: number) => !countryPart || countryKeys[i].startsWith(countryPart);

	const found: number[] = [];
	for (let k = lowerBound(namePart); k < sorted.length && keys[sorted[k]].startsWith(namePart); k++) {
		if (countryOk(sorted[k])) found.push(sorted[k]);
	}
	// indices are in priority order because `cities` is sorted by priority
	found.sort((a, b) => a - b);

	if (found.length < limit && namePart.length >= 3) {
		const seen = new Set(found);
		for (let i = 0; i < keys.length && found.length < limit; i++) {
			if (!seen.has(i) && keys[i].includes(namePart) && countryOk(i)) found.push(i);
		}
	}
	return found.slice(0, limit).map((i) => cities[i]);
}

const byCoords = new Map(cities.map((c) => [`${c.lat},${c.lng}`, c]));

/** Population of the city picked in CityPicker (coordinates are copied from the dataset as is). */
export const populationAt = (lat: number, lng: number) => byCoords.get(`${lat},${lng}`)?.population;
