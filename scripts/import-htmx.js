// Imports users from the old alumap-htmx SQLite database. Password hashes are kept as is (same bcrypt scheme).
// Usage: node scripts/import-htmx.js ../alumap-htmx/db.sqlite
import { DatabaseSync } from 'node:sqlite';
import { customAlphabet } from 'nanoid';
import postgres from 'postgres';

try {
	process.loadEnvFile();
} catch {
	// no .env
}

const src = process.argv[2];
if (!src) {
	console.error('Usage: node scripts/import-htmx.js <old db.sqlite>');
	process.exit(1);
}
if (!process.env.DATABASE_URL) {
	console.error('DATABASE_URL is not set');
	process.exit(1);
}

const publicId = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 10);
const sql = postgres(process.env.DATABASE_URL);
const old = new DatabaseSync(src, { readOnly: true });

let imported = 0;
for (const u of old.prepare('SELECT * FROM users').all()) {
	const rows = await sql`
		insert into users (
			nano_id, email, password_hash, first_name, last_name, graduation_year, bio, telegram_username,
			contact_email, contact_phone, website, location_name, location_lat, location_lng, show_location,
			is_approved, is_banned, created_at
		) values (
			${publicId()}, ${u.email.toLowerCase()}, ${u.password_hash}, ${u.first_name}, ${u.last_name},
			${u.innopolis_graduation_year}, ${u.bio}, ${u.telegram_alias?.replace(/^@/, '') ?? null},
			${u.contact_email}, ${u.contact_phone}, ${u.website},
			${u.location_string}, ${u.location_latitude}, ${u.location_longitude}, ${!!u.show_location},
			${!!u.is_verified}, ${!!u.is_banned},
			${u.created_at ? new Date(u.created_at * 1000) : new Date()}
		) on conflict (email) do nothing
		returning id`;
	imported += rows.length;
}
console.log(`Imported ${imported} users`);
old.close();
await sql.end();
