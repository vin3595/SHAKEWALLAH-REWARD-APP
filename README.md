# Rewards — universal restaurant loyalty platform

One customer app, many independent restaurant loyalty programs.
ShakeWallah is restaurant #1, not a special case — every restaurant is a
row in the same database, and a customer holds one global identity with a
**separate wallet per restaurant** ("ShakeWallah 50pts / Bite Box 20pts",
both in the same account). See the architecture write-up shared alongside
this repo for the full platform vision and phased roadmap.

## Stack

- **App**: Next.js (App Router) + Tailwind — customer app, staff dashboard, and restaurant CRM all in one codebase
- **Database**: Postgres via Prisma (any standard Postgres works — Prisma Postgres, Supabase, Neon, Railway, etc.)
- **Auth**: Phone number + OTP (dev mode logs the code to the console; MSG91 wiring included, see below)
- **Bill photos**: saved to `public/uploads` in dev — swap for object storage in production

## Database setup

You need a Postgres connection string before anything else works. Easiest
path with [Prisma Postgres](https://console.prisma.io):

1. Sign in at console.prisma.io, create a new project/database, pick a region.
2. Copy its connection string into `DATABASE_URL` in `.env` (copy `.env.example` first).

Any other Postgres provider's connection string works the same way — the
app has no Prisma-Postgres-specific code, just a standard `postgresql://` URL.

## Getting started

```bash
cp .env.example .env        # then fill in DATABASE_URL and SESSION_SECRET
npm install                 # also runs `prisma generate`
npm run db:migrate          # applies the schema to your database
npm run db:seed             # seeds two demo restaurants (ShakeWallah + Bite Box)
npm run dev
```

Open http://localhost:3000. (`npm run build` — used in production/Vercel —
runs `prisma migrate deploy` automatically first; `db:migrate` above uses
`migrate dev`, the interactive version, for local schema changes.)

Seeded staff logins (OTP, dev mode — the code is returned in the API
response and printed server-side, no real SMS is sent):

| Phone | Restaurant | Role |
|---|---|---|
| `9999900001` | ShakeWallah | Brand admin (`/staff/shakewallah/login`) |
| `9999900002` | ShakeWallah | Outlet staff (`/staff/shakewallah/login`) |
| `9999900003` | Bite Box | Brand admin (`/staff/bite-box/login`) |
| `9999900004` | Bite Box | Outlet staff (`/staff/bite-box/login`) |

Any 10-digit number works for a customer login at `/login` — first sign-in
creates the account, and that same identity works across every restaurant
on the platform. Bite Box is placeholder demo data, not a real brand — the
point is to have a second restaurant to demonstrate the universal wallet;
replace or remove it once you're onboarding real restaurant #2.

QR tokens seeded: `/scan/shakewallah-main`, `/scan/bitebox-indiranagar`.

## Identity model — the part that matters most

- **Customer** is global: one row per phone number, full stop.
- **Membership** is the wallet: one row per (customer, restaurant) pair,
  holding a tier. This is what "My Rewards" actually lists one row per —
  not the customer, not the restaurant.
- **PointsLedgerEntry** and **Redemption** are scoped to a *membership*,
  not directly to a customer — so ShakeWallah's points and Bite Box's
  points are two separate, independently-computed balances (Σ of that
  membership's ledger), even though it's the same person underneath.

This is why the schema uses `Membership` as its own table instead of just
scoping `Customer` by `restaurantId` (which was last session's model,
matching a white-label-per-brand app) — a customer needs to belong to
*many* restaurants at once, each with its own balance.

## How the core loop works

1. Customer signs in once (phone + OTP), browses **Discover** on the home
   page for restaurants they're not a member of yet, and scans a QR at any
   outlet.
2. Scanning submits a bill number, amount, and photo — creating a
   **pending** `BillClaim`. No points awarded yet, no membership required
   to exist beforehand.
3. That restaurant's staff (outlet staff for their outlet, brand admin
   across all outlets) review pending claims at `/staff/[slug]` and
   approve or reject.
4. Approval gets-or-creates a `Membership` for (customer, that
   restaurant) and writes a ledger row — 1 point per ₹10 spent by default
   (`src/lib/points.ts`).
5. The home page's **My Rewards** section lists every restaurant the
   customer has a membership at, each with its own balance
   (`src/lib/membership.ts#listCustomerWallets`).
6. Redeeming a reward at `/r/[slug]/rewards` debits that restaurant's
   membership and issues a redemption. Instead of a static code, the
   screen shows a **live QR** (`LiveRedemptionQR.tsx`) that re-signs and
   re-renders every 5 seconds (`src/lib/redemptionToken.ts`, 15s expiry)
   — a screenshot of it stops working almost immediately, closing the
   "share the code with a friend" hole a static code/QR has. The plain
   text code is still shown underneath as a manual-entry fallback.
7. Staff scan that QR with their device camera (`QrScanner.tsx`, using
   `jsqr` — no native deps). A scan only **looks up** the redemption
   (`/api/staff/redemptions/lookup`) and shows the customer's name for a
   visual "is that you?" check — it never fulfills by itself. Staff tap
   "Confirm & fulfil" to actually mark it used, via the same
   `/api/redemptions/[code]/fulfill` route the manual fallback uses. A
   code from one restaurant can't be looked up or fulfilled by another
   restaurant's staff (verified end to end, including token expiry).

Guardrails already in place: a bill number can only be claimed once per
outlet, a customer is capped at 5 claims/day platform-wide, a redemption
code can only be fulfilled once, and two bill-specific checks
(`src/lib/billSequence.ts`):

- **24-hour claim window** — the customer enters the bill's own date/time
  (not when they happen to open the app), and the claim is rejected if
  that's more than 24h in the past or in the future.
- **Bill-number sequence check** — receipt numbers are sequential over
  time in virtually every POS/GST-compliant billing system, so a new
  claim is rejected if its (numeric part of the) bill number is out of
  order relative to the nearest already-claimed bills at that outlet by
  date — e.g. once bill #23 is claimed, a later-dated bill can't claim a
  *lower* number, and an earlier-dated bill can't claim a *higher* one.
  Only checked against non-rejected claims, and skipped entirely if a
  bill number has no digits to compare. Verified with prefixed bill
  numbers too (e.g. "INV-0024" slots in fine between #23 and #25).

## Restaurant CRM (segments & campaigns)

A brand admin's dashboard (`/staff/[slug]/campaigns`) can:

1. **Define a segment** — a rule evaluated live against that restaurant's
   memberships, not a stored snapshot (`src/lib/segments.ts`):
   - `INACTIVE_DAYS` — no ledger activity in N days (win-back)
   - `MIN_LIFETIME_SPEND` — lifetime approved bill total ≥ ₹N
   - `MIN_VISITS` — approved bill claims ≥ N
2. **Create a campaign** — a message + optional bonus points, targeting a
   segment or the whole membership base.
3. **Send it** — credits the bonus to every matched membership's ledger
   and logs a `CampaignRecipient` row per recipient (the basis for
   opens/redemptions/ROI reporting later).

What this is *not* yet: there's no actual push/SMS delivery of the
campaign message — "sending" credits points and records who was targeted,
but customers don't get notified out-of-band. That's the natural next
piece once notifications exist at all (see below).

## Loyalty tiers

Each restaurant can define its own tiers at `/staff/[slug]/tiers` (brand
admin only) — a name, a lifetime-spend threshold in rupees, and an earn
rate in points per ₹100 spent (`src/lib/tiers.ts`). A restaurant that
never sets any up just uses the platform default (10 pts/₹100 = 1pt/₹10,
same rate the platform launched with) — tiers are additive, not required.

- A membership is placed in the **highest tier its lifetime approved
  spend at that restaurant has crossed**, recalculated after every
  approved claim.
- Tiers are **upgrade-only**: a membership never drops to a lower tier
  even if you edit thresholds later. (Changing a tier's numbers also
  doesn't retroactively move existing memberships — they re-evaluate on
  their next approved claim, not immediately.)
- The rate used for a claim is the tier the customer was in **before**
  that claim — crossing a threshold takes effect on the *next* purchase,
  not retroactively on the one that got them there. Verified: a customer
  who crossed ShakeWallah's Gold threshold earned that crossing claim at
  the old (Silver) rate, then the following claim at the new (Gold) rate.
- The restaurant profile page shows the customer's current tier and, if
  there's a higher one, how much more spend it takes to reach it.

## What's stubbed or deferred

Deliberately out of scope for this pass — flagged here instead of half-built:

- **Discovery UI**: the home page lists restaurants; there's no map,
  distance/geolocation, search, or category filters yet. `Restaurant` has
  `lat`/`lng`/`category` fields ready for this — needs a maps provider
  (Google Maps/Places or Mapbox) and an API key.
- **Bill OCR**: claims require the customer to type the bill number and
  amount by hand; there's no automatic reading of the bill photo. Needs a
  vision/OCR provider (Google Cloud Vision, or a multimodal LLM call).
- **Referrals, streaks, badges**: not built. Tiers *are* built (see above).
- **POS integrations**: bill claims are entirely manual/self-reported.
- **Campaign delivery**: see above — segments and bonuses work, outbound
  notification doesn't exist.
- **PWA installability**: `public/manifest.json` exists but has no icons
  yet, and there's no service worker for offline caching.

## SMS provider setup (MSG91)

OTP delivery is wired to [MSG91](https://msg91.com)'s Flow API
(`src/lib/sms.ts`) but stays in **dev mode** — the code is logged and
returned in the API response, no SMS sent — until you set:

```
MSG91_AUTH_KEY=<your auth key>            # Console → API → Auth Key
MSG91_OTP_TEMPLATE_ID=<your template id>  # Console → Flow → your OTP template
```

You'll need a DLT-registered transactional template (required for Indian
SMS) with a single variable — name it `OTP` — e.g.:

> Your verification code is ##OTP##. Valid for 10 minutes.

Once both env vars are set, `requestOtp` (`src/lib/otp.ts`) sends a real
SMS automatically — no code changes needed. To use a different provider
(Twilio, etc.), only `src/lib/sms.ts` needs to change; its two exports
(`isSmsConfigured`, `sendOtpSms`) are the whole contract.

## Deploying to Vercel

1. Get a `DATABASE_URL` (see Database setup above) and a `SESSION_SECRET`
   (`openssl rand -base64 32`).
2. On vercel.com: **Add New → Project**, import this repo, pick the branch
   to deploy.
3. Under **Environment Variables**, add `DATABASE_URL` and `SESSION_SECRET`
   (and the `MSG91_*` ones if you have them). Deploy.

`npm run build` runs `prisma migrate deploy` before `next build`
(`package.json`), so the database schema is applied automatically on every
deploy — no separate migration step to remember. First deploy creates all
the tables; later deploys only apply whatever's new.

The initial migration (`prisma/migrations/20260908000000_init`) was
generated offline with `prisma migrate diff --from-empty` rather than
against a live database — useful to know if you ever need to regenerate a
baseline migration without a reachable Postgres instance in front of you.

## Project layout

```
prisma/schema.prisma          data model — Restaurant, Outlet, Customer (global),
                               Membership (the wallet), staff, bill claims,
                               points ledger, rewards, redemptions, Segment/Campaign
prisma/seed.ts                seeds ShakeWallah + a demo second restaurant
src/lib/                      session/OTP auth, points rule, storage, restaurant/
                               membership/segment lookups
src/app/(customer pages)      /login, / (wallet + discovery home), /r/[slug]
                               (restaurant profile + rewards), /scan/[token]
src/app/staff/[slug]/         staff OTP login, claim approval + redemption
                               dashboard, and /campaigns (brand-admin CRM)
src/app/api/                  route handlers backing all of the above
```

`.claude/`, `.agents/`, `.windsurf/`, and `skills-lock.json` at the repo
root are Prisma's own reference docs for AI coding agents (added by
`prisma init`) — not app code, safe to ignore or remove.
