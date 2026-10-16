import crypto from 'node:crypto';
import { populationAt } from './cities.ts';

const DENSITY = 2500; // people per km², assumed for every city
const DEFAULT_POPULATION = 20_000;
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));
const KM_PER_DEG = 111.32;

/** Deterministic pseudo random numbers in [0, 1) from a string seed. */
function random(seed: string) {
	let counter = 0;
	return () => crypto.createHash('sha256').update(`${seed}:${counter++}`).digest().readUInt32BE(0) / 2 ** 32;
}

/** `key` must be unique among all items, e.g. "user:12" / "event:3". */
type Located = { key: string; lat: number; lng: number };

/**
 * People and events share their city, not the exact place, so everything in a city has the same coordinates.
 * To draw them, members of a city are spread over the city disk (area = population / density)
 * with a sunflower pattern: points end up evenly spaced, like after Voronoi relaxation, without iterating.
 * A seeded jitter keeps it from looking like a grid. The seed depends on the city and its members,
 * so the same data always gives the same positions.
 */
export function scatterInCities<T extends Located>(items: T[]): (T & { lat: number; lng: number })[] {
	const groups = Map.groupBy(items, (i) => `${i.lat},${i.lng}`);
	return [...groups.values()].flatMap((group) => {
		const { lat, lng } = group[0];
		const population = populationAt(lat, lng) ?? DEFAULT_POPULATION;
		// cities are not circles, so keep people close to the center: 8% of the city radius
		const radiusKm = 0.08 * Math.sqrt(population / DENSITY / Math.PI);
		const members = group.toSorted((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
		const n = members.length;
		const rand = random(`${lat},${lng}|${members.map((m) => m.key).join(',')}`);
		const rotation = rand() * 2 * Math.PI;
		const jitter = 0.35 * radiusKm / Math.sqrt(n); // fraction of spacing between neighbours

		return members.map((m, k) => {
			const r = radiusKm * Math.sqrt((k + 0.5) / n);
			const angle = rotation + k * GOLDEN_ANGLE;
			const x = r * Math.cos(angle) + (rand() - 0.5) * jitter;
			const y = r * Math.sin(angle) + (rand() - 0.5) * jitter;
			return {
				...m,
				lat: lat + y / KM_PER_DEG,
				lng: lng + x / (KM_PER_DEG * Math.cos((lat * Math.PI) / 180))
			};
		});
	});
}
