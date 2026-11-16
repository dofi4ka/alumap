import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import { env } from '../env.ts';
import * as schema from './schema.ts';

const client = postgres(env.databaseUrl);

export const db = drizzle({ client, schema, casing: 'snake_case' });

/** Applies pending migrations; awaited by the server's `init` hook before requests are served. */
export async function migrateDb() {
	await migrate(db, { migrationsFolder: 'drizzle' });
}

export * from './schema.ts';
