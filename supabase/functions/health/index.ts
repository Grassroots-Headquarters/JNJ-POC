import "@supabase/functions-js/edge-runtime.d.ts";

// Proves the Edge Function path is wired end to end. Later tickets add real
// functions (Invites, billing, push) beside this one.
Deno.serve(() => Response.json({ ok: true, service: "jnj-site-app" }));
