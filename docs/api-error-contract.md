# API error contract

All API routes should return errors using a single envelope:

```json
{
  "error": "You do not have permission to perform this action.",
  "code": "FORBIDDEN",
  "details": {}
}
```

## Canonical auth errors

| HTTP status | code | message |
| --- | --- | --- |
| 401 | `UNAUTHENTICATED` | `Authentication is required.` |
| 403 | `FORBIDDEN` | `You do not have permission to perform this action.` |

Use shared helpers from `@lib/apiResponses`:

- `unauthenticatedResponse()`
- `forbiddenResponse()`

## Server usage

- Prefer `apiErrorResponse(code, message, options)` for typed envelope errors.
- Existing helpers in `@lib/apiResponses` (`errorResponse`, `validationErrorResponse`, `notFoundResponse`) are backed by the same envelope.

## Frontend usage

- Parse and branch on top-level `code` instead of string matching against `error`.
- Use `getApiErrorCode(...)` and `getApiErrorMessage(...)` from `@lib/apiErrorContract`.
- `getApiErrorMessage` is backward-compatible with both legacy `{ "error": "..." }` and temporary nested error envelopes during migration.

## Guardrail

ESLint blocks inline auth error strings inside `NextResponse.json(...)`. Use shared helpers instead.
