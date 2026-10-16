import { json } from '@sveltejs/kit';
import { searchCities } from '#lib/server/cities.ts';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = ({ url }) => {
	const q = url.searchParams.get('q') ?? '';
	return json(
		searchCities(q.slice(0, 100)).map((c) => ({
			label: [c.name, c.admin, c.country].filter(Boolean).join(', '),
			name: `${c.name}, ${c.country}`,
			lat: c.lat,
			lng: c.lng
		}))
	);
};
