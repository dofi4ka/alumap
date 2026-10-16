# Alumap

Map of Innopolis University alumni: SvelteKit + Drizzle (SQLite) + Tailwind 4 + MapLibre + grammY, all in one container.

## Development

```sh
pnpm install
cp .env.example .env   # SMTP and BOT_TOKEN are optional in dev
pnpm dev
```

Without `SMTP_HOST`, verification codes are printed to the console.
The database and uploaded images live in `DATA_DIR` (`./data`). Migrations run automatically on start.

After changing `src/lib/server/db/schema.ts` run `pnpm drizzle-kit generate`.

## Production

```sh
docker compose up -d --build
```

Put it behind an HTTPS reverse proxy (the Telegram miniapp requires https).

## Admins

Admins can't create other admins from the UI. Grant it from the shell:

```sh
docker compose exec alumap node scripts/set-admin.js you@innopolis.university
```

## Migrating from alumap-htmx

```sh
node scripts/import-htmx.js ../alumap-htmx/db.sqlite
```

Password hashes are compatible (bcrypt, cost 12, 72-byte truncation), so old passwords keep working.
