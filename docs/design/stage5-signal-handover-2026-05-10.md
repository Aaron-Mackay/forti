# Stage 5 Signal Handover — 2026-05-10

## Shipped in this pass

### Signal coach check-ins desk

- Intended commit: `Build Signal coach check-ins desk slice`
- Routes:
  - `/user/coach/check-ins`
  - `/user/coach/clients/[clientId]/check-ins`
- The flagged path now uses the planning surface and a rebuilt desk layout instead of the older utility card shell.
- Legacy rendering remains intact when `signalUiEnabled` is off.

## What changed

- Added route-level `loadSignalFlag()` + `SignalSurface(planning)` to both check-ins list pages.
- Passed `signalEnabled` into the shared `CoachCheckInsClient` so both routes stay on one behavior path.
- Rebuilt the flagged branch inside `CoachCheckInsClient` with:
  - planning-surface hero
  - queue metrics
  - `Needs review` and `Browse archive` tabs
  - planning-style search/filter block
  - Signal list rows for check-ins
  - preserved configure-template action on the global route only
- Added focused Playwright coverage for the flagged desk route.

## Preserved behavior

- unread/new queue still comes from `listCoachCheckIns({ unread: true })`
- browse/search still uses the same `listCoachCheckIns()` route and filters
- global route still exposes `Configure template`
- client-locked route still defaults to archive/browse mode
- review links still navigate to the existing review detail routes

## Verification completed

- `rtk npm run build` in `apps/web`
- `BASE_URL=http://127.0.0.1:3003 npx playwright test tests/e2e/coach-review.test.ts --project=chromium --grep "flagged check-in list shows the Signal planning desk"`

## Known residuals

- `tests/e2e/coach-review.test.ts` still contains the older legacy photo-dialog navigation failure documented in the previous handover.
- That failure is unrelated to this new Signal desk slice.

## Recommended next slice

Next coach-only routes still outside the newer Signal pattern:

- `/user/coach/check-in-template`
- `/user/coach/learning-plans`

If continuing by adjacency, `check-in-template` is the cleaner next step because it sits directly behind the new desk’s `Configure template` action.
