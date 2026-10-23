---
status: accepted
---

# Supabase backend, no custom API server

Supersedes ADR 0004. The backend is Supabase, hosted in the London region, with no separate API server. Data rules are enforced in Postgres with row-level security and database functions, and anything needing secret keys (billing webhooks, Invites, SMS) runs in Supabase Edge Functions. We chose this for a slimmer API layer, built-in auth, storage and realtime, and less to build, accepting lock-in to Supabase and putting business logic in the database rather than a .NET codebase we already know. As in ADR 0004, it shares nothing with Roots.

There are two apps over this one backend: the **Admin app**, a Next.js app on Vercel for Admins, and the **Mobile app**, built with Expo for iOS and Android (ADR 0002). The Mobile app's web build is deployed to its own Vercel site for internal testing only, against a non-production Supabase project, and is never offered to Users. Both apps and the Supabase project live in one pnpm monorepo, sharing types generated from the database schema.

## Considered Options

- The .NET 8 API from ADR 0004. Rejected: more to build and run before the first feature ships.
- A plain React single-page app for the Admin app. Rejected in favour of Next.js, which server-renders the public sign-up pages ADR 0001 needs.
