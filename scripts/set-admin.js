// Usage: node scripts/set-admin.js <email> [--remove]
// Admins can't grant admin rights from the UI, it is done from the server shell.
import path from 'node:path';
import Database from 'better-sqlite3';

const [email, flag] = process.argv.slice(2);
if (!email) {
	console.error('Usage: node scripts/set-admin.js <email> [--remove]');
	process.exit(1);
}
const db = new Database(process.env.DATABASE_PATH || path.join(process.env.DATA_DIR || 'data', 'db.sqlite'));
const isAdmin = flag === '--remove' ? 0 : 1;
const res = db
	.prepare('UPDATE users SET is_admin = ?, is_approved = CASE WHEN ? THEN 1 ELSE is_approved END WHERE email = ?')
	.run(isAdmin, isAdmin, email.toLowerCase());
console.log(res.changes ? `${email}: admin=${!!isAdmin}` : `No user with email ${email}`);
