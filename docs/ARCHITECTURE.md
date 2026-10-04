# ClientProfit — Architecture

> Know exactly what every client makes you.

Status: **MVP complete (steps 1–12)**: data model, profitability engine, auth + organizations, seed data, dashboard, clients, client detail, org-wide record sections, profitability table, renewals and settings.

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
  i18n/                     Dutch/English messages, locale resolution, translate helpers
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
- The client list sorts by financial figures, which need the engine. Search and status filters therefore run in SQL, and sorting and pagination run after calculation. This is fine for agency-sized client lists; revisit it with cached snapshots if lists grow to thousands.
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
- Updates and deletes use `updateMany`/`deleteMany` with `{ id, organizationId }` and fail when nothing matched, so an id from another organization is a 404, never a write.
- Record forms post a `returnTo`. `safeReturnTo()` only accepts paths of the same client, so a tampered field can't become an open redirect.
- `src/server/repositories/tenant-isolation.test.ts` proves that organization B can't list, read, update, archive, delete or attach to organization A's clients, services, domains, hosting, costs or time entries. It also proves that the database itself rejects a cross-organization insert. It runs only when `TEST_DATABASE_URL` points at a database whose name contains "test".
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

- **Per-record figures** (the profit per domain, or the monthly profit of a hosting product) come from `summarizeBySource()`, so the client tabs never do arithmetic themselves.

Tested in `profitability.test.ts`: normalisation, the €12/€24 domain example, Kapsalon Zafer, the 149/17/50 → 82 / 55% example, Client C, labour windows, date boundaries, cancellations, thresholds, portfolio totals and the timeline.

## 6. Languages (`src/i18n`)

The UI is available in Dutch (default) and English.

- **Messages** live in `src/i18n/messages/parts/*.ts`. Each part holds `en` and `nl` side by side, and `part()` makes the compiler reject a Dutch part whose keys differ from the English one. `en.ts` and `nl.ts` combine the parts; a new part must be added to both.
- **Keys are typed.** `t("…")` only accepts existing keys, and enum labels use template keys such as `` t(`clientStatus.${status}`) ``, so a missing translation is a type error.
- **Language choice:** the `cp_locale` cookie (the latest choice on this device), then the user's saved `User.locale` (so it follows them to a new device), then the browser's `Accept-Language`, then Dutch. The switcher (sidebar, mobile header and sign-in pages) sets the cookie and, when signed in, saves the choice on the user. Signing in saves a choice made on the sign-in page; a new account starts with the language it was created in.
- **Server components** call `getI18n()`; **client components** use `useI18n()` from the provider in the root layout.
- **Errors:** validation schemas and server actions return message keys made with `msg(key, params)` instead of English text. Forms translate them when rendering (`tm()`), so a server action never needs to know the viewer's language. Zod's built-in messages are mapped to generic keys in `invalid()`. The team page only shows `?error=` values that are known keys.
- **Numbers and dates:** amounts and percentages use Dutch notation (`€ 1.234,56`) in both languages, because the business data is Dutch. Dates follow the language (`nl-NL` / `en-GB`).

## 7. Implementation order

1. ✅ Inspect project → empty repo, stack chosen
2. ✅ Prisma schema (tenant-safe composite FKs, NUMERIC money, indexes)
3. ✅ Profitability engine + tests
4. ✅ Next.js scaffold, Tailwind, shadcn/ui-style components, Prisma client, Better Auth, signup → creates Organization + OWNER membership, org context + repositories
5. ✅ Seed: demo organization + user, 5 clients + 1 lead, with domains, hosting, costs and time entries
6. ✅ Dashboard: KPI cards, profit per client, revenue vs costs chart, upcoming renewals, attention needed
7. ✅ Clients: list (search/filter/sort/pagination), create/edit/archive/delete, onboarding flow (client → service → costs → domain → hosting → done)
8. ✅ Client detail: KPIs and tabs (Overview, Revenue, Costs, Services, Domains, Hosting, Time, Profitability, Notes), with create/edit/delete of services, domains, hosting, other costs and time entries
9. ✅ Domains / Hosting / Other costs / Time sections: org-wide lists with filters and create/edit/delete (Time is filtered and paginated in SQL)
10. ✅ Profitability table: MRR, direct costs, labour, hours, profit, margin, annual revenue/profit, share of profit. Filters: active / negative / low margin; presets: highest revenue / profit / cost / hours; search, sortable columns, pagination, company and selection totals
11. ✅ Renewals: overdue + next 7/30/90 days, filter by type and client, with the yearly value of each renewing item (item revenue, client revenue for contracts, cost for software)
12. ✅ Settings: company (name, logo URL, currency, timezone), financial (default internal hourly cost, margin thresholds, labour window), billing (default interval). Only OWNER/ADMIN can change them; changing the hourly cost never rewrites existing time entries
13. After each step: lint, typecheck, tests. ✅ Repository-level tenant-isolation tests run against a real Postgres (`TEST_DATABASE_URL`).

After the MVP:
- ✅ Team: invitation links (only a SHA-256 hash of the token is stored; single use; 7-day expiry; must be accepted with the invited email), role changes (Admin/Member), member removal, organization switcher. The owner can't be changed or removed, and nobody can edit their own membership. No email is sent: the admin shares the link.
- ✅ Logo upload to Vercel Blob (PNG/JPEG/WebP, max 512 KB, type detected from file content; SVG refused). Active only when `BLOB_READ_WRITE_TOKEN` is set.
- ✅ Vercel functions pinned to Frankfurt (`vercel.json`).
- ✅ Dutch and English UI (see section 6), with the choice saved per user (`User.locale`).

Out of scope for v1 (the architecture leaves room for them): integrations (Mollie is the likely first one), invoice import, AI assistant, client portal, white-labeling, public API.
