# JNJ Site App

One place for each building Job: team chat, materials, photos, issues and site attendance. See `CONTEXT.md` for the vocabulary and `docs/adr/` for decisions.

## Layout

| Path | What |
|---|---|
| `apps/admin` | Admin app: Next.js App Router, Tailwind 4, shadcn/ui, `@supabase/ssr`, TanStack Query, Sentry |
| `apps/mobile` | Mobile app: Expo (Expo Router, NativeWind, TanStack Query, supabase-js, Sentry). Its web build is for internal testing only |
| `packages/shared` | `@jnj/shared`: database types generated from the schema, the typed Supabase client factory, plain shared logic |
| `packages/harness` | `@jnj/harness`: logs tests in as a fixed test User against local Supabase and returns a typed client |
| `integration` | Vitest integration tests that call the same tables, functions and Edge Functions the apps call, as a signed-in User |
| `supabase` | Local Supabase project: `config.toml`, `migrations/`, `seed.sql`, `functions/` (Edge Functions), `tests/` (pgTAP) |
| `e2e` | Playwright tests that run against both web builds |
| `scripts` | `dev.sh` (one-command local dev), `setup-accounts.sh` (account wizard) |
| `demo` | Clickable HTML demos; a style and copy reference only |

## Prerequisites

- Node 24 (`.nvmrc`; `nvm use`) and pnpm 12 (`corepack enable` or `npm i -g pnpm@12`)
- Docker, for local Supabase

## Run locally

```bash
pnpm install
pnpm dev
```

`pnpm dev` starts local Supabase (API on `http://127.0.0.1:55321`, Studio on `http://127.0.0.1:55323`), writes `apps/admin/.env.local` and `apps/mobile/.env.local` from the local keys if they do not exist, regenerates the database types, then runs the Admin app on <http://localhost:3000> and the Mobile app's web build on <http://localhost:8081>. Both home screens read the `platform_status` row and show "Connected". `Ctrl+C` stops everything (set `KEEP_SUPABASE=1` to leave the database up).

To run the Mobile app on a phone, use a development build (`cd apps/mobile && pnpm exec expo start`); Expo Go is not used.

Phone login uses fixed test numbers locally (`+447700900001` to `+447700900019`, code `123456`); see `supabase/config.toml`. The seed (`supabase/seed.sql`) creates Users for 001-005 (Alex Admin and Sam Site of "JNJ Building", Bea Boss of "Hart Builders", Dee Dual in both, Cleo Client in neither) so you can log straight in; 006-019 are unseeded and free for sign-up and Invite flows (Playwright uses 006 for sign-up and 010 for the Invite journey; the integration tests use 007-009, 011 and 012, and 016-019 for billing). Two local-only quirks worth knowing: the CLI only enables phone login when an SMS provider block is enabled, so `[auth.sms.twilio_verify]` is on with placeholder values (test numbers never reach it), and `max_frequency` is 1ms so the same User can request codes back to back.

## Test

| Command | What it runs |
|---|---|
| `pnpm lint` | ESLint in every package |
| `pnpm typecheck` | `tsc --noEmit` in every package (the Admin app runs `next typegen` first) |
| `pnpm test` | Vitest unit tests (`packages/*/src/**/*.test.ts`, app tests) |
| `pnpm test:db` | pgTAP tests in `supabase/tests/` against the running local Supabase |
| `pnpm test:integration` | Vitest tests in `integration/tests/` against the running local Supabase, logged in through `@jnj/harness` |
| `pnpm gen:types` | Regenerate `packages/shared/src/database.types.ts` from the running local database. Commit the result; CI fails on drift |
| `pnpm test:e2e` | Playwright against the Admin production build (`next start`) and the Mobile web export (`serve -s dist`) |

Playwright expects both builds to exist and to have been built against local Supabase:

```bash
pnpm supabase start
eval "$(pnpm --silent supabase status -o env --override-name api.url=NEXT_PUBLIC_SUPABASE_URL --override-name auth.anon_key=NEXT_PUBLIC_SUPABASE_ANON_KEY | sed 's/^/export /')"
export EXPO_PUBLIC_SUPABASE_URL="$NEXT_PUBLIC_SUPABASE_URL" EXPO_PUBLIC_SUPABASE_ANON_KEY="$NEXT_PUBLIC_SUPABASE_ANON_KEY"
pnpm --filter @jnj/admin build
pnpm --filter @jnj/mobile export:web
pnpm exec playwright install chromium   # once
pnpm test:e2e
pnpm supabase stop --no-backup
```

`.github/workflows/ci.yml` runs all of the above on every pull request.

## Delivery

Merging to `main` deploys to staging; a `vX.Y.Z` tag, after approval, deploys to production. See `docs/delivery.md` for what deploys when, which environment points where, how to cut a release or ship a JavaScript-only fix, and the first-run checklist.

## Database changes

Every schema change is a migration: `pnpm supabase migration new <name>`, edit the file under `supabase/migrations/`, then `pnpm supabase db reset` and `pnpm gen:types`. Add a pgTAP test under `supabase/tests/` for every new table's access rules.

## Environment variables

Each app has a committed `.env.example`; copy it to `.env.local` (git-ignored) or let `pnpm dev` write it. Leaving the Sentry DSN empty switches Sentry off. Edge Function secrets live in `supabase/functions/.env` (see `supabase/functions/.env.example`); the local edge runtime reads that file when `supabase start` runs, so copy the example before starting (CI does the same). No secret is ever committed; hosted keys live in GitHub Actions secrets and Vercel settings, set by `scripts/setup-accounts.sh`.

## Billing

Each Company is a Stripe customer and each Add-on (so far `client_portal`) a monthly subscription (ADR 0008). Admins open Stripe Checkout and the Stripe customer portal from the Admin app's `/billing` page through the `billing-checkout` and `billing-portal` Edge Functions; only the `stripe-webhook` Edge Function switches an Add-on on or off, by writing `add_on_subscriptions` through `apply_stripe_subscription`. Apps read `company_has_add_on(company, add_on)` or the table. Locally and in CI there is no `STRIPE_SECRET_KEY`: the two hosted-page functions answer 503, and `integration/tests/billing.test.ts` drives the webhook with test-mode events signed with the local-only `STRIPE_WEBHOOK_SECRET` from `supabase/functions/.env.example`. The Mobile app shows no prices and only reads whether an Add-on is on.

## Invites

An Admin invites a mobile number with a Role from the Admin app's Team page (`/team`). The row is created by the `create_invite` database function and texted by the `send-invite` Edge Function (`POST /functions/v1/send-invite` with `{ "inviteId" }` and the Admin's JWT; the Invite is read under that JWT, so anyone who is not an Admin of its Company gets 403). With `TWILIO_ACCOUNT_SID` unset, as locally and in CI, the SMS is recorded in the service-role-only `outbound_sms` table instead, which the tests read. The link is `<INVITE_LINK_BASE_URL>/invite/<code>` (default `https://app.example.com`): it opens the Mobile app through universal links and app links (`apps/admin/public/.well-known/`, placeholder team id and fingerprint), and without the app the Admin app serves `/invite/<code>` with the store buttons. The Mobile app also answers `jnjsite://invite/<code>`. Opened while logged out, the code is kept (`jnj.pendingInviteCode`) and picked up after login; the invitee confirms their name (and trade, for a Subcontractor) and `accept_invite` adds the Membership to their existing login. Invites are single-use and expire after 7 days; Admins can cancel or resend them, change a Member's Role and remove people, all effective on the next query.
