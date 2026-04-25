# Contract Checklist (Redesign PRs)

When a redesign changes data needs for any API-backed UI:

- [ ] **Schema updated** in `src/lib/contracts/*` (request/response zod schema + inferred type).
- [ ] **Route updated** in `src/app/api/**/route.ts` to parse request and/or return the updated contract shape.
- [ ] **Client parser updated** to validate responses with the matching contract schema (for example `fetchJsonWithSchema`).
