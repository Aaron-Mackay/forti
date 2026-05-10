# Stage 5 Signal Handover — 2026-05-10

## Shipped in this pass

### Signal coach check-ins desk

- Commit: `a8aa3b5` `Build Signal coach check-ins desk slice`
- Routes:
  - `/user/coach/check-ins`
  - `/user/coach/clients/[clientId]/check-ins`
- The flagged path now uses the planning surface and a rebuilt desk layout instead of the older utility card shell.
- Legacy rendering remains intact when `signalUiEnabled` is off.

### Signal coach check-in template workspace

- Intended commit: `Build Signal coach check-in template slice`
- Route:
  - `/user/coach/check-in-template`
- The flagged path now uses the planning surface and a Signal workspace shell around the existing drag/drop editor.
- The template-builder internals are intentionally preserved in this slice; this is a shell/composition pass, not a ground-up editor rebuild.

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
- Added route-level `loadSignalFlag()` + `SignalSurface(planning)` to the check-in-template page.
- Passed `signalEnabled` into `CheckInTemplateEditor`.
- Wrapped the flagged editor in a Signal workspace shell with:
  - planning-surface hero
  - card/input/system counts
  - builder framing and action styling
  - preserved editor behaviors and preview/save flow
- Added focused Playwright coverage for the flagged template workspace.

## Preserved behavior

- unread/new queue still comes from `listCoachCheckIns({ unread: true })`
- browse/search still uses the same `listCoachCheckIns()` route and filters
- global route still exposes `Configure template`
- client-locked route still defaults to archive/browse mode
- review links still navigate to the existing review detail routes
- template load/save/delete still use the existing `/api/coach/check-in-template` flow
- drag/drop editor behavior remains the existing implementation
- preview flow remains the existing implementation

## Verification completed

- `rtk npm run build` in `apps/web`
- `BASE_URL=http://127.0.0.1:3003 npx playwright test tests/e2e/coach-review.test.ts --project=chromium --grep "flagged check-in list shows the Signal planning desk"`
- `BASE_URL=http://127.0.0.1:3004 npx playwright test tests/e2e/redesign-regression.test.ts --project=chromium --grep "flagged coach sees the Signal check-in template workspace"`

## Known residuals

- `tests/e2e/coach-review.test.ts` still contains the older legacy photo-dialog navigation failure documented in the previous handover.
- That failure is unrelated to this new Signal desk slice.

## Recommended next slice

Next coach-only routes still outside the newer Signal pattern:

- `/user/coach/learning-plans`

Most natural next slice now:

- `/user/coach/learning-plans`

Reason:

- it is the next coach route still living on the older utility shell
- it is adjacent to the template/editor planning work
- it likely benefits from the same planning-surface treatment before any deeper information architecture changes
