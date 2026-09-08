# ShakeWallah Rewards

A points-based loyalty PWA for ShakeWallah, built on a multi-tenant data
model so any cafe, restaurant or QSR can run the same platform under its
own brand later. See the full architecture write-up (data model, earn/redeem
flows, phased roadmap) shared alongside this repo.

## Stack

- **App**: Next.js (App Router) + Tailwind, customer app + staff dashboard in one codebase
- **Database**: SQLite for local dev via Prisma, swappable to Postgres for production
- **Auth**: Phone number + OTP (dev mode logs the code to the console — no SMS provider wired up yet)
- **Bill photos**: saved to `public/uploads` in dev — swap for Supabase Storage / S3 in production

## Getting started

```bash
npm install                 # also runs `prisma generate`
npm run db:migrate          # creates prisma/dev.db and applies the schema
npm run db:seed             # seeds the ShakeWallah tenant, one outlet, staff logins, rewards
npm run dev
```

Open http://localhost:3000.

Seeded staff logins (OTP, dev mode — the code is returned in the API
response and printed server-side, no real SMS is sent):

| Phone | Role |
|---|---|
| `9999900001` | Brand admin (`/staff/login`) |
| `9999900002` | Outlet staff (`/staff/login`) |

Any 10-digit number works for a customer login at `/login` — first sign-in
creates the account.

The seeded outlet's QR code points to `/scan/shakewallah-main`. In a real
rollout this URL is what gets printed and put at the counter.

## How the core loop works

1. Customer signs in with phone + OTP, scans the outlet's QR, and submits a
   bill number, amount, and a photo at `/scan/[outletToken]`.
2. This creates a **pending** `BillClaim`. No points are awarded yet.
3. Outlet staff (or a brand admin, across all outlets) review pending
   claims at `/staff` and approve or reject them.
4. Approval writes a row to `PointsLedgerEntry` — 1 point per ₹10 spent by
   default (`src/lib/points.ts`). A customer's balance is always the sum of
   their ledger, never a stored column (see `prisma/schema.prisma`'s
   comments for why).
5. Customers redeem rewards at `/rewards`; redemption issues a short code,
   which staff mark fulfilled at `/staff` once handed over.

Guardrails already in place: a bill number can only be claimed once per
outlet, a customer is capped at 5 claims/day, and a redemption code can
only be fulfilled once.

## What's stubbed for later

- **SMS**: OTPs aren't actually sent. Wire a provider (MSG91 is a solid
  default for Indian numbers) in `src/lib/otp.ts` and remove the `devCode`
  passthrough before going live.
- **Bill photo storage**: local disk under `public/uploads`. Swap
  `src/lib/storage.ts` for Supabase Storage / S3 with signed URLs.
- **PWA installability**: `public/manifest.json` exists but has no icons
  yet, and there's no service worker for offline caching — add both once
  brand assets (logo, colors) are available.
- **Multi-tenant routing**: the schema is fully multi-tenant (every table
  carries `tenantId`), but this deployment only ever serves one tenant,
  picked by the `TENANT_SLUG` env var. Subdomain-based routing across
  brands is a later-phase concern, not a v1 one.

## Moving to Postgres

Local dev uses SQLite for zero-setup. For production:

1. In `prisma/schema.prisma`, change the datasource `provider` to `"postgresql"`.
2. Swap the driver adapter in `src/lib/prisma.ts` (and `prisma/seed.ts`)
   from `@prisma/adapter-better-sqlite3` to `@prisma/adapter-pg` (or
   Supabase's recommended adapter).
3. Point `DATABASE_URL` at your Postgres instance (Supabase's connection
   string works directly) and re-run `prisma migrate dev`.

## Project layout

```
prisma/schema.prisma       data model (tenants, outlets, customers, staff,
                            bill claims, points ledger, rewards, redemptions)
prisma/seed.ts             seeds the ShakeWallah tenant + demo data
src/lib/                   session/OTP auth, points rule, storage, tenant lookup
src/app/(customer pages)   /login, / (home), /scan/[token], /rewards
src/app/staff/             staff OTP login + claim approval / redemption dashboard
src/app/api/                route handlers backing all of the above
```

`.claude/`, `.agents/`, `.windsurf/`, and `skills-lock.json` at the repo
root are Prisma's own reference docs for AI coding agents (added by
`prisma init`) — not app code, safe to ignore or remove.
