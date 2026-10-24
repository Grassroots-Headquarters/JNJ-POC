-- Review fixes for Company separation (ADR 0007).
--
-- An Admin may rename their Company but not rewrite who referred it, its
-- Referral code or its Stripe customer: those decide who earns a free month
-- and which Stripe customer is billed. Column grants, as on jobs.
revoke update on public.companies from authenticated;
grant update (name, billing_email) on public.companies to authenticated;

-- Memberships change only through accept_invite, sign_up_company,
-- change_member_role and remove_member (all security definer), so an Admin
-- cannot skip the Invite or the "a Company keeps at least one Admin" rule by
-- writing the table. No write policies and no write privileges.
drop policy "Admins add Memberships to their Company" on public.memberships;
drop policy "Admins change Memberships in their Company" on public.memberships;
drop policy "Admins remove Memberships from their Company" on public.memberships;
revoke insert, update, delete on public.memberships from authenticated, anon;
