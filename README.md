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
| `pnpm db:migrate` | Create + apply a migration in development, then regenerate the client |
| `pnpm db:seed` | Recreate the demo organization (only touches demo data) |
