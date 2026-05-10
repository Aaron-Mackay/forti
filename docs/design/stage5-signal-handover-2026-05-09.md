# Stage 5 Signal Handover — 2026-05-09

## Shipped in this pass

### 1. Signal check-in review rebuild

- Commit: `4358cbd` `Build Signal check-in review slice`
- Routes:
  - `/user/coach/check-ins/[id]`
  - `/user/coach/clients/[clientId]/check-ins/[id]`
- The flagged path now renders a real calm-surface composition instead of only inheriting the calm theme wrapper.
- Preserved behavior:
  - coach notes save
  - target template save
  - Loom review URL + embed
  - supplements panel
  - plan link
  - reviewed timestamp feedback
- Legacy rendering is unchanged when `signalUiEnabled` is off.

### 2. Signal coach clients roster

- Current working tree change in this pass, intended as the next commit after review slice.
- Route:
  - `/user/coach/clients`
- The flagged path now renders a planning-surface roster built from the existing `getCoachClientHealthSummary()` read model.
- Preserved behavior:
  - legacy list remains for flag-off users
  - links into overview / check-ins / plans remain on existing routes
- New UI direction:
  - roster hero with counts for review / submitted / flagged
  - client cards with plan, last activity, unread count, risk flags
  - direct links into the already-shipped Signal overview/check-in flows

## Architectural correction

`loadSignalFlag()` was originally wrapped in a zero-argument React `cache()`. In practice this caused stale flag state across route requests in local verification and would be unsafe for user-specific settings reads. It now performs a live session + settings lookup per call.

Keep the current pattern:

- route-level `await loadSignalFlag()`
- `SignalSurface` at the page level
- pass the resolved boolean down into the route client where the UI branch actually changes

Do not reintroduce process-wide memoization around the flag helper.

## Verification completed

### Review slice

- `rtk npm run build` in `apps/web`
- `BASE_URL=http://127.0.0.1:3002 npx playwright test tests/e2e/coach-review.test.ts --project=chromium --grep "flagged check-in review shows the Signal calm review composition"`

### Coach clients slice

- `rtk npm run build` in `apps/web`
- `BASE_URL=http://127.0.0.1:3002 npx playwright test tests/e2e/coachClients.test.ts --project=chromium --grep "flagged coach sees the Signal client roster surface"`

### Previously revalidated during this sequence

- `BASE_URL=http://127.0.0.1:3001 npx playwright test tests/e2e/coachHome.test.ts --project=chromium --no-deps`
- `BASE_URL=http://127.0.0.1:3001 npx playwright test tests/e2e/coachClientOverview.test.ts --project=chromium --no-deps`

## Residual issue

`tests/e2e/coach-review.test.ts` still has an older legacy photo-dialog test that fails independently of the new Signal work:

- `clicking a tile opens the dialog with prev/next week navigation`

Current status:

- the new Signal review spec is green
- the legacy photo-compare selector test was partially stabilized
- one assertion still expects the previous-week dialog state to appear after clicking the nav button, but the dialog state does not advance in the current harness

This is not blocking the new Signal slices, but the file is not fully green end-to-end yet.

## Working conventions preserved

- Signal remains side-by-side behind `User.settings.signalUiEnabled`
- legacy coach pages are preserved rather than reskinned in place
- planning surface used for coach list / home / overview
- calm surface used for review detail
- commit message style remains slice-oriented "what + why"

## Files touched after `4358cbd`

- `apps/web/src/app/user/coach/clients/page.tsx`
- `apps/web/src/app/user/coach/clients/_components/SignalCoachClients.tsx`
- `apps/web/tests/e2e/coachClients.test.ts`

## Recommended next slice

If continuing coach-only work, the cleanest next route is:

- `/user/coach/check-ins`

Reason:

- it sits directly between the new roster and the rebuilt review detail
- the current list still reads as older MUI utility UI beside newer Signal coach surfaces
- it can likely be rebuilt as a planning-surface inbox/list without schema changes

Lower-confidence alternatives:

- `/user/coach/check-in-template`
- `/user/coach/learning-plans`

Those routes are less clearly covered by the original Stage 5 review/handover design notes than the check-ins list.
