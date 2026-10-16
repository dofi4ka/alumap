// Imports users from the old alumap-htmx database. Password hashes are kept as is (same bcrypt scheme).
// Usage: node scripts/import-htmx.js ../alumap-htmx/db.sqlite
import path from 'node:path';
import { customAlphabet } from 'nanoid';
import Database from 'better-sqlite3';

const src = process.argv[2];
if (!src) {
	console.error('Usage: node scripts/import-htmx.js <old db.sqlite>');
	process.exit(1);
}
const publicId = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 10);
const db = new Database(process.env.DATABASE_PATH || path.join(process.env.DATA_DIR || 'data', 'db.sqlite'));
const old = new Database(src, { readonly: true });

const insert = db.prepare(`INSERT INTO users (
	nano_id, email, password_hash, first_name, last_name, graduation_year, bio, telegram_username,
	contact_email, contact_phone, website, location_name, location_lat, location_lng, show_location,
	is_approved, is_banned, created_at
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(email) DO NOTHING`);

let imported = 0;
for (const u of old.prepare('SELECT * FROM users').all()) {
	const res = insert.run(
		publicId(), u.email.toLowerCase(), u.password_hash, u.first_name, u.last_name,
		u.innopolis_graduation_year, u.bio, u.telegram_alias?.replace(/^@/, '') ?? null,
		u.contact_email, u.contact_phone, u.website,
		u.location_string, u.location_latitude, u.location_longitude, u.show_location ? 1 : 0,
		u.is_verified ? 1 : 0, u.is_banned ? 1 : 0, u.created_at
	);
	imported += res.changes;
}
console.log(`Imported ${imported} users`);
