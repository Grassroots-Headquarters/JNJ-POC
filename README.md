# JNJ Site App

One place for each building Job: team chat, materials, photos, issues and site attendance. See `CONTEXT.md` for the vocabulary and `docs/adr/` for decisions.

## Layout

| Path | What |
|---|---|
| `apps/admin` | Admin app: Next.js App Router, Tailwind 4, shadcn/ui, `@supabase/ssr`, TanStack Query, Sentry |
| `apps/mobile` | Mobile app: Expo (Expo Router, NativeWind, TanStack Query, supabase-js, Sentry). Its web build is for internal testing only |
| `packages/shared` | `@jnj/shared`: database types generated from the schema, the typed Supabase client factory, plain shared logic |
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

Phone login uses fixed test numbers locally (`+447700900001` to `+447700900019`, code `123456`); see `supabase/config.toml`.

## Test

| Command | What it runs |
|---|---|
| `pnpm lint` | ESLint in every package |
| `pnpm typecheck` | `tsc --noEmit` in every package (the Admin app runs `next typegen` first) |
| `pnpm test` | Vitest unit tests (`packages/*/src/**/*.test.ts`, app tests) |
| `pnpm test:db` | pgTAP tests in `supabase/tests/` against the running local Supabase |
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

Each app has a committed `.env.example`; copy it to `.env.local` (git-ignored) or let `pnpm dev` write it. Leaving the Sentry DSN empty switches Sentry off. Edge Function secrets live in `supabase/functions/.env` (see `supabase/functions/.env.example`). No secret is ever committed; hosted keys live in GitHub Actions secrets and Vercel settings, set by `scripts/setup-accounts.sh`.
