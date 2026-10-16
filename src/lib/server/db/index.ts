import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { env } from '../env.ts';
import * as schema from './schema.ts';

fs.mkdirSync(env.dataDir, { recursive: true });

const client = new Database(process.env.DATABASE_PATH || path.join(env.dataDir, 'db.sqlite'));
client.pragma('journal_mode = WAL');
client.pragma('foreign_keys = ON');

export const db = drizzle(client, { schema, casing: 'snake_case' });

migrate(db, { migrationsFolder: 'drizzle' });

export * from './schema.ts';
