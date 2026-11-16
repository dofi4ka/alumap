import { eq } from 'drizzle-orm';
import { db, pages } from './db/index.ts';

export const ABOUT_SLUG = 'about';

const defaultAbout = {
	title: 'About Alumap',
	content: `Alumap is the map of the Innopolis University alumni community. It helps alumni, students, and friends stay connected wherever they are in the world.

Here you can find people on the map, see where they live and work, discover community events, and support projects started by alumni.

Create an account, fill in your profile, and mark your location so classmates can find you.`
};

/** The "about" page from the database, or the built-in text before an admin edits it. */
export async function getAboutPage() {
	const page = (await db.select().from(pages).where(eq(pages.slug, ABOUT_SLUG)))[0];
	return page ?? { slug: ABOUT_SLUG, ...defaultAbout, updatedAt: null };
}

export async function saveAboutPage(title: string, content: string) {
	await db
		.insert(pages)
		.values({ slug: ABOUT_SLUG, title, content })
		.onConflictDoUpdate({
			target: pages.slug,
			set: { title, content, updatedAt: new Date() }
		});
}
