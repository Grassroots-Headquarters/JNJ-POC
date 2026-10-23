import "@supabase/functions-js/edge-runtime.d.ts";

import { serve } from "../_shared/sentry.ts";

// Proves the Edge Function path is wired end to end. Later tickets add real
// functions (Invites, billing, push) beside this one, all served through the
// shared Sentry wrapper.
serve(() => Response.json({ ok: true, service: "jnj-site-app" }));
