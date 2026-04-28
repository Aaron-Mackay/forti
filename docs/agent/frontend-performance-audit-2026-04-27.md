# Frontend Performance Audit — 2026-04-27

Scope reviewed:

- `src/app/**` client-facing pages/components
- `src/components/**`
- `src/lib/**` frontend hooks/providers

## Executive summary

Potential performance and loading risks were found in chart rendering and background polling patterns. Two concrete hot paths were optimized in this pass:

1. Dashboard chart metric extraction now precomputes per-metric series once per metrics update.
2. Notifications polling now avoids network work while tabs are hidden and performs a refresh on tab visibility return.

## Findings

### 1) Repeated filtering in dashboard chart hot path (fixed)

- **Location:** `src/app/user/(dashboard)/DashboardChart.tsx`
- **Risk:** On interactions (zoom, drag, metric toggles), series derivation could repeatedly filter/map the full metric array per selected metric.
- **Impact:** More CPU work during chart interactions, which can reduce responsiveness on large datasets.
- **Fix in this change:** Build a memoized `metricDataByType` map once per `metrics` change and reuse it for series creation.

### 2) Background notifications polling while tab hidden (fixed)

- **Location:** `src/lib/providers/NotificationsProvider.tsx`
- **Risk:** Polling every minute continues regardless of tab visibility.
- **Impact:** Unnecessary background network requests and wakeups, especially for users with many open tabs.
- **Fix in this change:** Poll only when `document.visibilityState === 'visible'`, and trigger a fetch when the tab becomes visible.

### 3) Heavy chart dependency appears in multiple independently-loaded surfaces (follow-up)

- **Locations:**
  - `src/components/DataVizChartCard.tsx`
  - `src/app/user/(dashboard)/DashboardChart.tsx`
  - `src/app/user/workout/E1rmSparkline.tsx`
  - `src/app/exercises/ExerciseDetailDrawer.tsx`
- **Risk:** `react-apexcharts` is dynamically imported in several separate entry points.
- **Impact:** Can increase JS chunking overhead and slow first interactive chart render across routes.
- **Recommendation:** Centralize chart loader/wrapper to maximize cache hit behavior, enforce shared defaults, and make future migration/optimization easier.

## Next recommended checks

1. Run a bundle analysis (`ANALYZE=true npm run build`) to quantify chart-related bundle cost.
2. Profile dashboard interaction in Chrome Performance panel on realistic metric history sizes.
3. Consider data decimation for dense historical series before rendering.
