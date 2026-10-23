# Stripe Billing, and only Stripe switches Add-ons on

Add-ons are billed with Stripe Billing: each Company is a Stripe customer, each Add-on a monthly subscription item, and the Referral code free month is a Stripe coupon. An Add-on is switched on or off only by Stripe's webhooks reaching an Edge Function, never by the Admin app directly, so what a Company can use always matches what it is paying for. Admins manage cards and invoices in Stripe's hosted pages rather than screens we build.
