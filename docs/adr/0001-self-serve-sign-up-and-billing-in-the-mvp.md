# Self-serve sign-up and billing in the MVP

The MVP ships with self-serve Company sign-up and paid billing for the Client Portal, not a JNJ-only app onboarded by hand. We accepted the extra build (sign-up, onboarding, billing, strict separation between Companies) because the goal at the end of the MVP is that any construction company can sign up and use it out of the box, with JNJ as the first of many.

## Considered Options

- Multi-company data model, but JNJ onboarded by hand, with self-serve and billing after the pilot. This was rejected even though it ships to JNJ faster.
- A JNJ-only app, made generic later. Rejected because retrofitting separation between Companies is expensive.
