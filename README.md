# Alumap

Map of Innopolis University alumni: SvelteKit + Drizzle (PostgreSQL) + Tailwind 4 + MapLibre + grammY, deployed as one compose stack.

## Development

```sh
pnpm install
cp .env.example .env
docker compose up -d db   # PostgreSQL on localhost:5432
pnpm dev
```

Without `SMTP_HOST`, verification codes are printed to the console.
Uploaded images live in `DATA_DIR` (`./data`). Migrations run automatically on start.

After changing `src/lib/server/db/schema.ts` run `pnpm drizzle-kit generate`.

## Production

```sh
docker compose up -d --build
```

This starts the app together with PostgreSQL. Set a real `POSTGRES_PASSWORD` in `.env` before deploying.
Put the app behind an HTTPS reverse proxy (the Telegram miniapp requires https).

## Admins

Admins can't create other admins from the UI. Grant it from the shell:

```sh
docker compose exec alumap node scripts/set-admin.js you@innopolis.university
```

## Migrating from alumap-htmx

The old database is still SQLite, so the import script reads it with Node's built-in `node:sqlite`.
Run it against an empty PostgreSQL database:

```sh
DATABASE_URL=postgres://... node scripts/import-sqlite-full.js ../alumap-htmx/db.sqlite
```

It imports users, experiences, skills, events, projects, badges, sessions, pending
registrations, social links and default followed cities, preserves integer ids, and
sets the sequences afterwards. Uploaded images must be copied from the old `data/uploads`
directory into `DATA_DIR/uploads` separately.

Password hashes are compatible (bcrypt, cost 12, 72-byte truncation), so old passwords keep working.
