# ClientProfit — Architecture

> Know exactly what every client makes you.

Status: **steps 1–6 done**: data model, profitability engine, auth + organizations, seed data and dashboard. Next up: Clients.

## 1. Stack

The repository was empty, so there was no existing stack to keep.

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js (App Router) + TypeScript (strict) | Server Components and Server Actions keep DB access and financial math on the server |
| UI | Tailwind CSS v4 + shadcn/ui-style components, Recharts | Plain, Stripe/Linear-style UI. The shadcn registry is unreachable from the build container, so the few primitives we need live in `src/components/ui` in the same style |
| DB | PostgreSQL + Prisma 7 (`prisma-client` generator) | `NUMERIC` money columns, composite FKs for tenant safety |
| Auth | **Better Auth** (email/password to start, magic link / OAuth later) | Auth.js v5 is still in beta. Better Auth is stable, has a first-class Prisma adapter and database sessions |
| Validation | Zod | Same schemas for forms (client) and Server Actions (server) |
| Money | `decimal.js` | Never JS `number` for amounts |
| Tests | Vitest | Fast unit tests for the engine |
| Package manager | pnpm | npm 10 hits an arborist bug on vitest 4's peer set |

## 2. Layering

```
src/
  app/                      Next.js routes (thin: fetch via services, render)
    (auth)/login, signup
    (app)/dashboard, clients, clients/[id]/..., domains, hosting, costs, time, renewals, settings
  components/               Presentational components (no DB, no financial math)
    ui/                     shadcn primitives
  lib/
    profitability/          ★ Pure calculation engine — the ONLY place money is computed
    validation/             Zod schemas per entity
    format/                 Currency/percent/date formatting (presentation rounding)
  server/
    auth/                   Better Auth config + getOrgContext()/requireRole()
                            Active org = cookie preference, always re-verified against Membership
    db.ts                   Prisma client singleton
    repositories/           Org-scoped queries. Every function takes OrgContext as its first arg
    services/               Use cases: profitability loading, renewals, attention rules
    actions/                Server Actions: auth → zod → repository → revalidate
```

Rules:
- UI components never import Prisma and never do financial math. They receive formatted or `Decimal` values from services.
- Repositories are the only code that touches Prisma. Each one requires an `OrgContext { organizationId, userId, role }`, and there is no unscoped variant.
- Services turn DB rows into engine input (`buildClientLines`) and engine output into view models.

## 3. Multi-tenancy & security

Tenancy is enforced at three levels:

1. **Database:** every tenant table has `organizationId`. Child tables (Service, Domain, Hosting, Cost, TimeEntry) reference `Client(id, organizationId)` through a *composite* foreign key. So even a buggy query cannot link a service to another organization's client.
2. **Repository layer:** every query filters on `ctx.organizationId`. Lookups by id use `where: { id, organizationId }` (`findFirst`), never `findUnique({ id })` alone. Creates take `organizationId` from the context, never from form input.
3. **Request context:** `getOrgContext()` reads the session and the `cp_active_org` cookie. The cookie is honoured only if the user has a `Membership` for that organization. Otherwise it falls back to the user's first membership. A user without any organization is sent to `/onboarding`.

Other rules:
- All mutations are Server Actions with Zod validation on the server.
- Secrets live only in env vars (`DATABASE_URL`, `BETTER_AUTH_SECRET`).
- `src/proxy.ts` only does an optimistic cookie check. Every page and action re-checks the session server-side.
- Postgres Row-Level Security can be added later as defence in depth. The schema already supports it.

## 4. Data model

See `prisma/schema.prisma`. Overview:

```
User ─< Membership >─ Organization (settings: currency, timezone, hourly cost, margin thresholds)
                          │
                          └─< Client (status, archivedAt, contractRenewalDate)
                                 ├─< Service   (sellingPrice + supplierCost per interval)
                                 ├─< Domain    (purchaseCost yr1, renewalCost, sellingPrice / yr)
                                 ├─< Hosting   (purchaseCost + sellingPrice per interval)
                                 ├─< Cost      (other client-bound costs)
                                 └─< TimeEntry (hours × internal hourlyCost snapshot)
```

Decisions:
- **Money:** `Decimal(12,2)` for amounts, `Decimal(10,2)` for hourly cost, `Decimal(6,2)` for hours, `Decimal(5,2)` for percent thresholds.
- **`TimeEntry.hourlyCost` is a snapshot.** It defaults to the organization's `defaultHourlyCost` when the entry is created. Changing the setting later does not rewrite history.
- **Renewals are derived, not stored.** They come from `Domain.renewalDate`, `Hosting.renewalDate`, `Cost.renewalDate`, `Service.endDate` and `Client.contractRenewalDate`. A separate `Renewal` table would duplicate those dates and drift out of sync. A `Contract` table (documents, contract value, notice period) is only added when there is a real need for it. For now, `Client.contractRenewalDate` covers contract renewals.
- **Domain status:** `ACTIVE` / `CANCELLED` are set by the user. `EXPIRING` is shown in the UI when the renewal date is within 30 days. `EXPIRED` ends revenue and cost on the renewal date.
- **Integration-ready:** `externalProvider` + `externalId` on Client/Service/Domain/Hosting/Cost, unique per organization for clients. Future importers (Moneybird, Exact, Stripe, registrars) upsert on those fields. No integration code is included now.
- **Suppliers, registrars and providers** are free text in the MVP. They become a `Supplier` table once registrar/hosting APIs arrive.
- **Soft archive:** `Client.archivedAt`. Delete is a hard delete and cascades to the client's records.

## 5. Profitability engine (`src/lib/profitability`)

These are pure functions with no I/O, and they are the single source of truth for all financial figures.

**FinancialLine** is the core abstraction. Every revenue or cost source is mapped to lines of the form `{ kind: REVENUE | DIRECT_COST, amount, interval, startDate, endDate }`. The engine never needs to know whether a line came from a service, domain, hosting product or cost.

### Formulas

| | |
|---|---|
| Yearly equivalent | monthly × 12, quarterly × 4, yearly × 1, one-time → 0 |
| Monthly equivalent | yearly equivalent / 12 (so quarterly = amount / 3, yearly = amount / 12) |
| MRR | Σ monthly equivalent of active recurring revenue lines |
| ARR | Σ yearly equivalents (= MRR × 12, computed exactly) |
| Labour cost | Σ hours × internal hourlyCost |
| Monthly labour | labour cost in the trailing window (default 3 months) / months in the window |
| Gross profit | revenue − direct costs − labour |
| Margin % | gross profit / revenue × 100; **null** when revenue = 0 |
| Company margin | Σ profit / Σ revenue (weighted by revenue). The unweighted mean of client margins is also available |

### Explicit choices
- **Exact arithmetic:** `Decimal` with 40 significant digits. Values are rounded only for presentation (half-up, cents / 0.1%). Annual figures are computed from yearly equivalents, so a quarterly amount never produces `399.99…`.
- **One-time amounts** are left out of MRR/ARR and run-rate profit. They do appear in the month-by-month timeline, in the month they occur.
- **Labour is not recurring,** so its monthly figure is a trailing average. For clients younger than the window, the window starts at the client's start date, with a minimum of one month.
- **Domains:** `purchaseCost` applies to the first year only and `renewalCost` applies after that. They never overlap, so costs are not double counted.
- **Inactive services** without an end date are excluded. With an end date, the history is kept. The app sets `endDate = today` when a user deactivates a service.
- **Margin status is neutral and threshold-based:** `POSITIVE` / `LOW` / `NEGATIVE` / `NO_REVENUE`. The thresholds come from organization settings.
- **Timeline** (the Revenue vs Costs chart): recurring lines are prorated by the days they are active in each month. It is derived from start and end dates, not from invoices, and the UI labels it that way.

Tested in `profitability.test.ts`: normalisation, the €12/€24 domain example, Kapsalon Zafer, the 149/17/50 → 82 / 55% example, Client C, labour windows, date boundaries, cancellations, thresholds, portfolio totals and the timeline.

## 6. Implementation order

1. ✅ Inspect project → empty repo, stack chosen
2. ✅ Prisma schema (tenant-safe composite FKs, NUMERIC money, indexes)
3. ✅ Profitability engine + tests
4. ✅ Next.js scaffold, Tailwind, shadcn/ui-style components, Prisma client, Better Auth, signup → creates Organization + OWNER membership, org context + repositories
5. ✅ Seed: demo organization + user, 5 clients + 1 lead, with domains, hosting, costs and time entries
6. ✅ Dashboard: KPI cards, profit per client, revenue vs costs chart, upcoming renewals, attention needed
7. Clients: list (search/filter/sort/pagination), create/edit/archive/delete, onboarding flow (client → service → costs → domain → hosting → done)
8. Client detail: KPIs and tabs (Overview, Revenue, Costs, Services, Domains, Hosting, Time, Profitability, Notes)
9. Domains / Hosting / Costs / Time sections (CRUD, org-wide)
10. Profitability table (all columns, filters, sorting, pagination)
11. Renewals (7/30/90 days) + attention rules
12. Settings (company, financial, billing)
13. After each step: lint, typecheck, tests. Also add repository-level tests for tenant isolation against a real Postgres instance.

Out of scope for v1 (the architecture leaves room for them): integrations, invoice import, AI assistant, client portal, white-labeling, public API.
