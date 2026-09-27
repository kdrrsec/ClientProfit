# ClientProfit

> Know exactly what every client makes you.

Per-client revenue, costs, labour, profit and margin for web agencies and freelancers.
Multi-tenant from day one. See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the design and every formula.

## Requirements

- Node.js 22+
- pnpm 10+
- PostgreSQL 14+

## Setup

```bash
pnpm install                      # also runs `prisma generate`
cp .env.example .env              # fill in DATABASE_URL and BETTER_AUTH_SECRET
pnpm db:deploy                    # apply migrations
pnpm db:seed                      # demo data (optional)
pnpm dev
```

Demo login after seeding: `demo@clientprofit.test` / `demo12345`.

## Scripts

| Script | |
|---|---|
| `pnpm dev` / `build` / `start` | Next.js |
| `pnpm lint` / `typecheck` / `test` | Quality checks (run after every change). Tenant-isolation tests also need `TEST_DATABASE_URL` (a separate database whose name contains `test`, migrated with `DATABASE_URL=… pnpm db:deploy`) |
| `pnpm db:migrate --name <name>` | Create + apply a migration in development; run `pnpm db:generate` afterwards (Prisma 7 no longer regenerates the client automatically) |
| `pnpm db:seed` | Recreate the demo organization (only touches demo data) |

## Deploying to Vercel

1. Import the repository in Vercel (framework: Next.js; the `vercel-build` script is used automatically).
2. Add a Postgres database via **Storage → Create Database → Neon** and connect it to the project. This sets `DATABASE_URL` (pooled) and `DATABASE_URL_UNPOOLED` (used for migrations).
3. Set `BETTER_AUTH_SECRET` (`openssl rand -base64 32`). `BETTER_AUTH_URL` is optional; the Vercel URLs are trusted automatically.
4. Optional: `SEED_DEMO_DATA=true` recreates the demo organization on every deploy (only the demo org and demo user are touched; it refuses to run if real users joined the demo org). The demo login is public, so don't enable this on a deployment with real data.
   To remove the demo account from a deployed database, deploy once with `REMOVE_DEMO_DATA=true` (see `prisma/remove-demo.ts`), then remove the variable.

5. Optional: connect a **Blob** store (Storage → Create → Blob) to enable logo uploads. This sets `BLOB_READ_WRITE_TOKEN`.

Migrations run during the build (`prisma migrate deploy`).

Functions run in Frankfurt (`fra1`, set in `vercel.json`). Keep the database in the same region: every page makes several database queries, so a cross-Atlantic hop adds up.
