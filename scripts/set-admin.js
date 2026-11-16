// Usage: node scripts/set-admin.js <email> [--remove]
// Admins can't grant admin rights from the UI, it is done from the server shell.
import postgres from 'postgres';

try {
	process.loadEnvFile();
} catch {
	// no .env
}

const [email, flag] = process.argv.slice(2);
if (!email) {
	console.error('Usage: node scripts/set-admin.js <email> [--remove]');
	process.exit(1);
}
if (!process.env.DATABASE_URL) {
	console.error('DATABASE_URL is not set');
	process.exit(1);
}

const sql = postgres(process.env.DATABASE_URL);
const isAdmin = flag !== '--remove';
const rows = await sql`
	update users
	set is_admin = ${isAdmin}, is_approved = case when ${isAdmin} then true else is_approved end
	where email = ${email.toLowerCase()}
	returning id`;
console.log(rows.length ? `${email}: admin=${isAdmin}` : `No user with email ${email}`);
await sql.end();
