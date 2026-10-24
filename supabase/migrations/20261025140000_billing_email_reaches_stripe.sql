-- Review fixes for the billing email (spec story 10, ADR 0005).
--
-- The billing email belongs to the Company; the unused per-User copy was
-- readable by everyone in the User's Companies.
alter table public.profiles drop column billing_email;

-- Admins change the Company's billing email through the billing-email Edge
-- Function, which updates the Stripe customer as well; written straight to
-- the table it would never reach Stripe. The name stays theirs to change.
revoke update (billing_email) on public.companies from authenticated;
