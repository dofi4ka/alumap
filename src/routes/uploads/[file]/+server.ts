import fs from 'node:fs/promises';
import path from 'node:path';
import { error } from '@sveltejs/kit';
import { uploadsDir } from '#lib/server/images.ts';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params }) => {
	if (!/^[\w-]+\.webp$/.test(params.file)) error(404, 'Not found');
	try {
		const data = await fs.readFile(path.join(uploadsDir, params.file));
		return new Response(data, {
			headers: {
				'content-type': 'image/webp',
				// file names are random and never reused
				'cache-control': 'private, max-age=31536000, immutable'
			}
		});
	} catch {
		error(404, 'Not found');
	}
};
