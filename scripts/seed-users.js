// Seeds 40 approved demo users with public locations.
// Re-running replaces previous demo users (emails ending with @seed.alumap).
// Usage: node scripts/seed-users.js
import crypto from 'node:crypto';
import path from 'node:path';
import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';

try {
	process.loadEnvFile();
} catch {
	// no .env
}

const db = new Database(path.join(process.env.DATA_DIR || 'data', 'db.sqlite'));

/** [city, lat, lng, how many users] — coordinates exactly as in assets/cities.csv (population lookup), — 20 in Russia (10 of them in Kazan/Innopolis), 20 abroad */
const places = [
	['Innopolis, Russia', 55.753686, 48.743306, 5],
	['Kazan, Russia', 55.7908, 49.1144, 5],
	['Moscow, Russia', 55.7506, 37.6175, 3],
	['Saint Petersburg, Russia', 59.95, 30.3167, 2],
	['Novosibirsk, Russia', 55.0333, 82.9167, 1],
	['Yekaterinburg, Russia', 56.8356, 60.6128, 1],
	['Nizhniy Novgorod, Russia', 56.3269, 44.0075, 1],
	['Ufa, Russia', 54.7261, 55.9475, 1],
	['Vladivostok, Russia', 43.115, 131.8853, 1],
	['Berlin, Germany', 52.5167, 13.3833, 2],
	['Belgrade, Serbia', 44.8178, 20.4569, 2],
	['Dubai, United Arab Emirates', 25.2697, 55.3094, 2],
	['Tbilisi, Georgia', 41.7225, 44.7925, 1],
	['Almaty, Kazakhstan', 43.24, 76.915, 1],
	['Tashkent, Uzbekistan', 41.3111, 69.2797, 1],
	['Amsterdam, Netherlands', 52.3667, 4.8833, 1],
	['London, United Kingdom', 51.5072, -0.1275, 2],
	['Lisbon, Portugal', 38.7122, -9.134, 1],
	['Istanbul, Turkey', 41.01, 28.9603, 1],
	['San Francisco, United States', 37.7558, -122.4449, 1],
	['New York, United States', 40.6943, -73.9249, 1],
	['Toronto, Canada', 43.7417, -79.3733, 1],
	['Singapore, Singapore', 1.3, 103.8, 1],
	['Bangkok, Thailand', 13.75, 100.5167, 1],
	['Sydney, Australia', -33.8678, 151.21, 1]
];

const firstNames = ['Anna', 'Ivan', 'Oleg', 'Maria', 'Timur', 'Alina', 'Dmitry', 'Kamila', 'Ruslan', 'Eva', 'Artem', 'Dina', 'Ilya', 'Sofia', 'Marat', 'Elina', 'Nikita', 'Leysan', 'Kirill', 'Polina'];
const lastNames = ['Smirnov', 'Ivanov', 'Khabibullin', 'Petrov', 'Garaev', 'Sokolov', 'Nurlanov', 'Volkov', 'Zakirov', 'Morozov', 'Galiev', 'Orlov'];
const headlines = ['Backend engineer', 'ML engineer', 'Product manager', 'iOS developer', 'Data scientist', 'DevOps engineer', 'Frontend developer', 'Founder', 'Security researcher', 'PhD student'];
const companies = ['Yandex', 'JetBrains', 'Kaspersky', 'Tinkoff', 'Sber', 'Ozon', 'Avito', 'Google', 'Booking.com', 'Revolut', 'own startup'];

const pick = (arr, i) => arr[i % arr.length];
const nanoId = () =>
	Array.from(crypto.randomBytes(10), (b) => '0123456789abcdefghijklmnopqrstuvwxyz'[b % 36]).join('');
// nobody knows this password, demo users cannot log in
const passwordHash = bcrypt.hashSync(crypto.randomBytes(16).toString('hex'), 12);

const insert = db.prepare(`
	insert into users (nano_id, email, password_hash, first_name, last_name, graduation_year, headline,
		location_name, location_lat, location_lng, show_location, is_approved)
	values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1)`);

db.transaction(() => {
	const removed = db.prepare(`delete from users where email like '%@seed.alumap'`).run().changes;
	let i = 0;
	for (const [city, lat, lng, count] of places) {
		for (let k = 0; k < count; k++, i++) {
			const first = pick(firstNames, i * 7 + 3);
			const last = pick(lastNames, i * 5 + 1);
			insert.run(
				nanoId(),
				`demo${i + 1}@seed.alumap`,
				passwordHash,
				first,
				last,
				i % 4 === 3 ? null : 2016 + (i % 10),
				`${pick(headlines, i)} at ${pick(companies, i * 3)}`,
				city,
				lat,
				lng
			);
		}
	}
	console.log(`removed ${removed} old demo users, inserted ${i}`);
})();
