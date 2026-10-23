---
status: superseded by ADR 0006
---

# .NET 8 backend, separate from Roots

The backend is a .NET 8 API using the same clean-architecture pattern as Roots (MediatR/CQRS, `Result<T>`), with Postgres hosted in a UK region. It shares no code, login service or database with Roots. We chose a stack we already know so we can ship quickly, and kept the two products apart because they have different customers and may be sold or partnered differently.

## Considered Options

- Sharing the Roots login service and infrastructure. Rejected because it couples two unrelated products.
- A backend-as-a-service such as Supabase. Rejected in favour of a stack we already know.
