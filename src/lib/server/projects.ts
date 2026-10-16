import { error, fail, type ActionFailure } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db, projects, type Project, type User } from './db/index.ts';
import { int, str } from './forms.ts';
import { publicId } from './ids.ts';
import { deleteImage, saveImage } from './images.ts';

export function getProject(nanoId: string, viewer: User) {
	const project = db.select().from(projects).where(eq(projects.nanoId, nanoId)).get();
	if (!project) error(404, 'Project not found');
	const canEdit = viewer.isAdmin || project.ownerId === viewer.id;
	if (project.status !== 'published' && !canEdit) error(404, 'Project not found');
	return { project, canEdit };
}

export async function deleteProject(project: Project) {
	db.delete(projects).where(eq(projects.id, project.id)).run();
	await deleteImage(project.imageId);
}

/** http(s) link or null; "example.com/donate" becomes "https://example.com/donate". */
function donationUrl(value: string | null): string | null | undefined {
	if (!value) return null;
	const withScheme = /^https?:\/\//i.test(value) ? value : `https://${value}`;
	try {
		return new URL(withScheme).href;
	} catch {
		return undefined;
	}
}

/**
 * Creates (project = null) or updates a project from form data.
 * Same review flow as events: users' projects go to moderation after every change, admins' are published.
 */
export async function saveProject(
	fd: FormData,
	user: User,
	project: Project | null
): Promise<Project | ActionFailure<{ error: string }>> {
	const title = str(fd, 'title', 120);
	const url = donationUrl(str(fd, 'donationUrl', 500));
	const goal = int(fd, 'fundraisingGoal');

	if (!title) return fail(400, { error: 'Title is required' });
	if (url === undefined) return fail(400, { error: 'Invalid donation link' });
	if (goal !== null && (goal < 0 || goal > 1_000_000_000)) return fail(400, { error: 'Invalid fundraising goal' });

	let imageId: string | null;
	try {
		imageId = await saveImage(fd.get('image'), 'project');
	} catch (e) {
		return fail(400, { error: (e as Error).message });
	}

	const values = {
		title,
		description: str(fd, 'description', 5000) ?? '',
		donationUrl: url,
		fundraisingGoal: goal || null
	};

	if (!project) {
		return db
			.insert(projects)
			.values({
				...values,
				imageId,
				nanoId: publicId(),
				ownerId: user.id,
				status: user.isAdmin ? 'published' : 'pending'
			})
			.returning()
			.get();
	}

	const removeImage = fd.get('removeImage') === 'on';
	const updated = db
		.update(projects)
		.set({
			...values,
			imageId: imageId ?? (removeImage ? null : project.imageId),
			status: user.isAdmin ? project.status : 'pending'
		})
		.where(eq(projects.id, project.id))
		.returning()
		.get();
	if (imageId || removeImage) await deleteImage(project.imageId);
	return updated;
}
