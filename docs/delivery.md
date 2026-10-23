# Delivery

How code reaches staging and production. Account names, secret names and
environment names are fixed by the setup wizard (`scripts/setup-accounts.sh`);
the workflows in `.github/workflows/` read exactly those names, and
`tests/delivery/` fails if either side drifts.

## What deploys when

| Event | What happens | Where it runs |
|---|---|---|
| Pull request | Lint, typecheck, unit, pgTAP and Playwright (`ci.yml`). Vercel builds an Admin app preview pointing at staging and comments the URL on the PR | GitHub Actions + Vercel Git integration |
| Push to `main` | Migrations and Edge Functions to the **staging** Supabase project; staging Mobile build to TestFlight and Play internal testing; Sentry releases (`staging.yml`). Vercel deploys the Admin app to its production URL and the Mobile web test site | GitHub Actions + Vercel Git integration |
| Tag `vX.Y.Z` | After a reviewer approves the `production` environment: migrations and Edge Functions to the **production** Supabase project; store builds of the Mobile app handed to EAS Submit; Sentry releases; GitHub release notes (`release.yml`) | GitHub Actions |
| Actions tab, by hand | `eas update` of a JavaScript-only fix to the `staging` or `production` channel (`eas-update.yml`); production waits for the same approval | GitHub Actions |

Vercel needs no token in GitHub: both Vercel projects are linked to this repo
through the Vercel Git integration and build on every push themselves.
Unaffected projects are skipped automatically because the apps are pnpm
workspace packages.

## Which environment points where

| Deployment | Supabase project | How it is set |
|---|---|---|
| Local (`pnpm dev`) | Local CLI stack, `http://127.0.0.1:55321` | `.env.local` written by `scripts/dev.sh` |
| Admin app PR previews (`jnj-admin`, Vercel Preview env) | staging | Vercel env vars `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` (wizard stage 12) |
| Admin app production (`jnj-admin`, Vercel Production env, branch `main`) | **production** | Vercel Production env vars (wizard stage 12) |
| Mobile web test site (`jnj-mobile-web-test`, every env) | staging only | Vercel env vars `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY` (wizard stage 13) |
| Mobile staging build (EAS profile `staging`, channel `staging`) | staging | EAS environment `preview` variables (first-run checklist below) |
| Mobile production build (EAS profile `production`, channel `production`) | production | EAS environment `production` variables (first-run checklist below) |
| Edge Functions | The project they are deployed to | Secrets set per project by the wizard; `SENTRY_RELEASE` and `SENTRY_ENVIRONMENT` set per deploy by the workflows |

The Admin app's production deploy follows `main`, not the tag: a tag only
gates the database, Edge Functions and store builds. Merge to `main` first, let
staging settle, then tag.

### The Mobile web test site is internal only

`jnj-mobile-web-test` exists so the Mobile app's web build can be tried in a
browser against staging. It must never be linked from the Admin app, Invite
SMS, store listings or any page a User sees. The wizard turns on Vercel
Deployment Protection (Vercel Authentication, all deployments including
production) so only Vercel team members can open it, and Playwright never
targets it (CI serves its own export of the same build on `localhost:8081`).

## Secrets and variables

Repository-level GitHub Actions secrets (wizard stage 14): `SUPABASE_ACCESS_TOKEN`,
`SUPABASE_STAGING_PROJECT_REF`, `SUPABASE_STAGING_DB_PASSWORD`,
`SUPABASE_PRODUCTION_PROJECT_REF`, `SUPABASE_PRODUCTION_DB_PASSWORD`,
`EXPO_TOKEN`, `SENTRY_AUTH_TOKEN`.

Repository-level GitHub Actions variables: `SENTRY_ORG`, `SENTRY_PROJECT_ADMIN`,
`SENTRY_PROJECT_MOBILE`, `SENTRY_PROJECT_EDGE`, `SENTRY_URL` (optional; the
workflows default to `https://sentry.io`, EU organisations use
`https://de.sentry.io`).

GitHub environments: `staging` (no approval) and `production` (required
reviewers). They exist for the approval gate only; secrets stay at repository
level. Without `EXPO_TOKEN` the Mobile jobs print a notice and skip; without
`SENTRY_ORG` the Sentry release steps skip.

## Sentry releases

| Project | Release label | Who creates it |
|---|---|---|
| `jnj-admin` | `admin@<sha>` | `apps/admin/next.config.ts` derives it from `VERCEL_GIT_COMMIT_SHA`, inlines it as `NEXT_PUBLIC_SENTRY_RELEASE` and `withSentryConfig` uploads source maps during the Vercel build when `SENTRY_AUTH_TOKEN` is set |
| `jnj-mobile` | `mobile@<version>+<sha>` | `apps/mobile/app.config.ts` derives it from `EAS_BUILD_GIT_COMMIT_HASH` (EAS Build), `VERCEL_GIT_COMMIT_SHA` (web test site) or `GITHUB_SHA` (`eas update`); the `@sentry/react-native/expo` plugin uploads source maps during EAS Build when `SENTRY_AUTH_TOKEN` is an EAS environment variable; `staging.yml`/`release.yml` record the release and deploy environment |
| `jnj-edge-functions` | `edge@<sha>` | `staging.yml`/`release.yml` set the `SENTRY_RELEASE` function secret and record the release; `supabase/functions/_shared/sentry.ts` reads it |

## EAS build profiles and updates

`apps/mobile/eas.json`:

| Profile | Distribution | Channel | EAS environment | Submit |
|---|---|---|---|---|
| `development` | internal, development client | `development` | `development` | none |
| `staging` | internal | `staging` | `preview` | iOS TestFlight, Android `internal` track |
| `production` | store | `production` | `production` | iOS App Store (TestFlight first), Android `production` track as a draft |

`autoIncrement` with `appVersionSource: remote` means EAS keeps the build
numbers. `expo-updates` uses `runtimeVersion: { policy: "appVersion" }`: an
update only reaches builds with the same `expo.version` in `app.json`, so bump
`version` whenever a native dependency or config plugin changes, then ship a
new build before the next `eas update`. The update URL is derived from
`extra.eas.projectId` once the wizard's `eas init` has filled it in.

## Cutting a release

```bash
git checkout main && git pull
git tag vX.Y.Z
git push --tags
```

Then open the `release` run under Actions, review it and approve the
`production` environment. The run applies migrations to production, deploys
Edge Functions, starts the store builds (they appear in the EAS dashboard and,
when finished, in App Store Connect and the Play Console) and publishes release
notes on the tag.

## Shipping a JavaScript-only fix

Actions → `eas-update` → Run workflow → channel `staging` or `production`,
message describing the change. Installed builds on that channel with a matching
runtime version receive it on next launch. Production waits for approval.

## First run (human checklist)

The pipeline is complete in code; nothing below needs a code change. Until
these are done the workflows either skip (no `EXPO_TOKEN`) or fail at the first
`supabase link`.

1. Run `scripts/setup-accounts.sh` to the end (it writes `.env.accounts`, the
   GitHub secrets and variables, the Vercel projects' variables and the Edge
   Function secrets). Commit the `extra.eas.projectId` that `eas init` wrote to
   `apps/mobile/app.json`.
   The Stripe stages (7 and 8) also create the Client Portal price, the
   `referral-free-month` coupon, the webhook endpoint
   (`<supabase url>/functions/v1/stripe-webhook`, six events) and activate
   the customer portal, and set the `STRIPE_SECRET_KEY`,
   `STRIPE_WEBHOOK_SECRET` and `STRIPE_CLIENT_PORTAL_PRICE_ID` Edge Function
   secrets per project. Without them the Billing page's Stripe buttons answer
   "Stripe is not set up on this environment" and no Add-on can switch on.
2. Create the GitHub environments: Settings → Environments → `staging` (no
   rules) and `production` (Required reviewers: the people who may approve a
   release; Deployment branches and tags: tag pattern `v*`).
3. EAS environment variables, so builds and updates point at the right
   Supabase project (values are in `.env.accounts`). From `apps/mobile`:
   ```bash
   eas env:create --environment preview    --name EXPO_PUBLIC_SUPABASE_URL      --value "$SUPABASE_STAGING_URL"      --visibility plaintext --non-interactive
   eas env:create --environment preview    --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "$SUPABASE_STAGING_ANON_KEY" --visibility plaintext --non-interactive
   eas env:create --environment preview    --name EXPO_PUBLIC_SENTRY_DSN        --value "$SENTRY_DSN_MOBILE"         --visibility plaintext --non-interactive
   eas env:create --environment production --name EXPO_PUBLIC_SUPABASE_URL      --value "$SUPABASE_PRODUCTION_URL"      --visibility plaintext --non-interactive
   eas env:create --environment production --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "$SUPABASE_PRODUCTION_ANON_KEY" --visibility plaintext --non-interactive
   eas env:create --environment production --name EXPO_PUBLIC_SENTRY_DSN        --value "$SENTRY_DSN_MOBILE"           --visibility plaintext --non-interactive
   eas env:create --environment preview    --name SENTRY_AUTH_TOKEN --value "$SENTRY_AUTH_TOKEN" --visibility secret --non-interactive
   eas env:create --environment production --name SENTRY_AUTH_TOKEN --value "$SENTRY_AUTH_TOKEN" --visibility secret --non-interactive
   ```
   If the Sentry organisation is in the EU, also create `SENTRY_URL` =
   `https://de.sentry.io` in both environments.
4. Store credentials on EAS (once, interactive): `eas credentials` in
   `apps/mobile` for iOS (distribution certificate, provisioning profile, App
   Store Connect API key, push key) and Android (upload keystore, Google
   Service Account JSON for Play submissions, FCM credentials). Then fill the
   two `REPLACE_WITH_*` placeholders in `apps/mobile/eas.json` submit profiles:
   `ascAppId` (App Store Connect → the app → App Information → Apple ID) and
   `appleTeamId` (`.env.accounts` `APPLE_TEAM_ID`). The Play app needs one
   manual upload before `eas submit` can target a track.
5. Confirm the bundle id `com.grassrootshq.jnjsite` and the domain before the
   first store build; the bundle id is permanent once in the stores.
6. Merge to `main` and watch the `staging` run: `supabase db push` succeeds,
   the EAS build appears in the dashboard, Sentry shows `edge@<sha>` and
   `mobile@<version>+<sha>`. Open the Admin app's Vercel URL and the Mobile web
   test site: both show **Connected**. Install the TestFlight / Play internal
   build on a phone: it shows **Connected** against staging.
7. First release: `git tag v0.1.0 && git push --tags`, approve, and check the
   production Admin URL shows **Connected** against production.

Item 6 is the ticket's "connected screen verified on staging in a browser and
on a real phone" acceptance criterion; it can only be done by a person with the
accounts.

### Not yet exercised

No real Supabase, Vercel, EAS or Sentry account existed when this pipeline was
written, so the workflows have been parsed, linted (`actionlint`) and
contract-tested but not run. Two steps follow vendor documentation without a
live check: `eas update` leaving its export in `dist` for
`sentry-expo-upload-sourcemaps`, and `eas submit` in non-interactive mode
using credentials stored on EAS. Expect to adjust those on the first run.
