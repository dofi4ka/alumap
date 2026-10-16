import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { nanoid } from 'nanoid';
import { env } from './env.ts';

export const uploadsDir = path.join(env.dataDir, 'uploads');
const MAX_UPLOAD = 15 * 1024 * 1024;

const presets = {
	avatar: { main: { width: 512, height: 512, fit: 'cover' }, thumb: 128 },
	event: { main: { width: 1200, height: 1200, fit: 'inside' }, thumb: 256 },
	project: { main: { width: 800, height: 800, fit: 'cover' }, thumb: 256 }
} as const;

/** Converts uploaded image to webp (full + square thumbnail). Returns image id or null if no file. */
export async function saveImage(file: unknown, kind: keyof typeof presets): Promise<string | null> {
	if (!(file instanceof File) || file.size === 0) return null;
	if (file.size > MAX_UPLOAD) throw new Error('Image is too large (max 15 MB)');

	const preset = presets[kind];
	const input = sharp(Buffer.from(await file.arrayBuffer())).rotate();
	const id = nanoid(16);
	await fs.mkdir(uploadsDir, { recursive: true });
	try {
		await Promise.all([
			input
				.clone()
				.resize({ ...preset.main, withoutEnlargement: true })
				.webp({ quality: 80 })
				.toFile(path.join(uploadsDir, `${id}.webp`)),
			input
				.clone()
				.resize({ width: preset.thumb, height: preset.thumb, fit: 'cover' })
				.webp({ quality: 75 })
				.toFile(path.join(uploadsDir, `${id}-thumb.webp`))
		]);
	} catch {
		await deleteImage(id);
		throw new Error('Could not read the image');
	}
	return id;
}

export async function deleteImage(id: string | null | undefined) {
	if (!id) return;
	await Promise.allSettled([
		fs.rm(path.join(uploadsDir, `${id}.webp`)),
		fs.rm(path.join(uploadsDir, `${id}-thumb.webp`))
	]);
}
