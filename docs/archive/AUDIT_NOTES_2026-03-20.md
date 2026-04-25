# Forti App Audit


## Contents

1. Title + date
2. Executive summary (3–4 sentences)
3. **Phase 1A** — Feature inventory (all 15 domains, current state, key files, technical debt)
4. **Phase 1B** — Quality scorecard table + biggest strengths/weaknesses
5. **Phase 2** — Competitive research (4 categories, 19 apps, competitive position, gaps table)
6. **Phase 3A** — Comparison matrix (24 rows × 10 competitors)
7. **Phase 3B** — Feature recommendations (improvements table + new features table)
8. **Phase 3C** — Strategic positioning (3 options, recommendation, 3–6 month roadmap, moats)
9. **Prioritized Roadmap** — P0–P3 tables

---

## PHASE 1A — FEATURE INVENTORY

### 1. Authentication & User Management
**Status: Fully implemented**
- Google OAuth + Demo login (Bob's account, no password)
- JWT session strategy; user ID embedded in token
- Proxy auth guard (`src/proxy.ts`) — cookie check + redirect
- No user registration (invite/OAuth only)
- Key files: `src/lib/auth.ts`, `src/app/login/`, `src/app/api/auth/`

---

### 2. Workout Tracking (Core)
**Status: Fully implemented**
- Plan → Week → Workout → Exercise drill-down navigation
- Set logging: reps + weight per set; drop sets with parent/child structure
- E1RM auto-calculation (Epley formula) on every set write (`src/lib/e1rm.ts`)
- Cardio tracking: duration, distance, resistance per exercise
- Previous sets display (fetched from last completed workout with this exercise)
- E1RM sparkline chart per exercise (ApexCharts, `E1rmSparkline.tsx`)
- Muscle highlight visualization (SVG body map, `MuscleHighlight.tsx`)
- Swipe navigation between exercises (Swiper v12)
- Exercise substitution with substitution history tracking
- Add exercises mid-workout (not in original plan; `isAdded` flag on WorkoutExercise)
- Workout notes (per-workout free text)
- Exercise form cues (notes on WorkoutExercise)
- Workout completion modal with date recorded
- Stopwatch / rest timer (toggled in settings; `StopwatchContext`)
- Offline support (IndexedDB cache + sync queue via `useOfflineCache`, `offlineSync.ts`)
- Week muscle summary view (`WeekMuscleSummary.tsx`)
- Key files: `src/app/user/workout/`, `src/lib/useWorkoutEditor.ts` (392 lines), `src/context/WorkoutEditorContext.tsx`, `src/utils/userPlanMutators.ts` (661 lines)

**Technical debt:**
- `useWorkoutEditor.ts`: 30+ action types in a single reducer; `createUuid()` uses Date.now() — collision possible within same millisecond
- `userPlanMutators.ts`: `// todo if exercise isn't in exercises, add it to db` (line 133) — incomplete; dummy exercise fallback used instead
- `userPlanMutators.ts`: multiple `// eslint-disable-next-line @typescript-eslint/no-explicit-any` casts for ExerciseCategory

---

### 3. Training Plan Management
**Status: Fully implemented**
- Plans list view (own plans + client plans grouped by client)
- Plan creation flow with three entry points:
  - **Manual build**: blank plan editor with drag-and-drop (dnd-kit)
  - **Template browser**: filterable by category (PPL, Upper/Lower, Full Body, etc.)
  - **AI import**: text → Claude API → structured plan (`api/plan/ai-import`, rate-limited 10/hr, 100KB cap)
  - **CSV upload**: TSV/CSV parser → plan structure
- Plan editor: drag-and-drop weeks/workouts/exercises; rep ranges, rest times, exercise notes
- Plan versioning by `order` field (gapless integer sequences)
- Coach can create plans for clients (via `?forUserId=` param with ownership check)
- Key files: `src/app/user/plan/`, `src/app/api/plan/`, `src/utils/aiPlanParser.ts`, `src/utils/sheetUpload.ts`

**Technical debt:**
- `sheetUpload.ts`: `// @ts-nocheck` at top of file; naive CSV parser (no escaped quote handling); three TODOs including missing user ID validation; `id: "N/A"` dummy exercises
- `TemplateBrowserScreen.tsx`: plan templates are hardcoded in `planTemplates.ts` — not database-driven

---

### 4. Exercise Library
**Status: Fully implemented (core); missing discovery/detail features**
- Global exercise database (shared across all users); unique by name + category
- Fields: name, category (resistance/cardio), description, equipment[], primaryMuscles[], secondaryMuscles[]
- Search/filter in exercise picker
- Create custom exercises inline from picker dialog
- Personal notes per exercise (per-user)
- No exercise video/animation, form guidance, or rich descriptions in UI (fields exist but not displayed prominently)
- No exercise ratings, difficulty levels, or user-generated content
- Key files: `src/app/exercises/`, `src/app/api/exercises/`, `src/lib/exerciseQueries.ts`

---

### 5. Calendar & Events
**Status: Fully implemented**
- FullCalendar multi-month view
- Block events: Bulk, Cut, Maintenance, Deload, Prep, Refeed, Custom subtypes
- Custom events with configurable color and name
- Overlap prevention for block events
- Daily metrics input per calendar day (weight, steps, sleep, macros)
- DayMetricBar visualization per day
- Week list view alternative (`WeekListView.tsx`)
- Bottom drawer (mobile) / right drawer (desktop) for event details and day input
- Event CRUD (create, read, update, delete)
- Key files: `src/app/user/calendar/`, `src/app/api/event/`, `src/lib/events.ts`, `src/lib/apiSchemas.ts`

**Issues:**
- No recurring events
- No calendar sync (Google Calendar, iCal export)
- Workout completion dates aren't automatically plotted on calendar

---

### 6. Nutrition Tracking
**Status: Fully implemented**
- Daily calorie, protein, carbs, fat logging
- Steps and sleep (minutes) tracking
- Weight tracking
- Per-day targets for all metrics (stored on `DayMetric` model)
- Week navigation (previous/next week)
- Linear progress bars vs targets
- Block context display (shows current training block type)
- Coach can view client nutrition
- Key files: `src/app/user/nutrition/NutritionClient.tsx`, `src/app/api/dayMetric/`, `src/app/api/coach/clients/[clientId]/nutrition/`

**Issues:**
- No nutrition goals beyond per-day targets (no macro splits, no calorie cycle)
- No food database / food logging (manual number entry only)
- No meal structure (breakfast/lunch/dinner)
- Targets set per-day, not programmable by training block or day type

---

### 7. Supplements Management
**Status: Fully implemented (feature-flagged)**
- CRUD: name, dosage, frequency, notes, start/end dates
- Feature flag: hidden unless `showSupplements` setting is enabled
- Coach can view client supplements (read-only)
- E2E tested (`tests/e2e/supplements.test.ts`)
- Key files: `src/app/user/supplements/`, `src/app/api/supplements/`

**Issues:**
- No supplement database/lookup; fully free-text entry
- No interaction warnings or reminders
- No supplement effectiveness tracking

---

### 8. Weekly Check-in
**Status: Fully implemented**
- 6 subjective ratings (1–5): energy level, mood, stress, sleep quality, recovery, adherence
- Workout count tracking (planned vs completed)
- Free text: week review, goals for next week, message to coach
- Coach notes section (written by coach, read-only for athlete)
- `coachReviewedAt` timestamp on coach note
- Check-in history view with expandable cards
- Metrics summary table in history (`MetricsSummaryTable.tsx`)
- Coach email alert on check-in submission
- Weekly reminder emails + push notifications (cron job)
- Check-in day configurable in settings
- Key files: `src/app/user/check-in/`, `src/app/user/coach/check-ins/`, `src/app/api/check-in/`, `src/app/api/cron/check-in-reminders/`

**Issues:**
- No photos (progress photos) in check-in
- No body measurement fields (waist, arms, etc.) in check-in
- Coach cannot see athlete's metrics chart from check-in view (separate nutrition page)
- No check-in E2E test

---

### 9. Analytics & Progress Visualization
**Status: Partially implemented — significant gap**
- E1RM sparkline per exercise (dashboard-level, in exercise detail view)
- Dashboard metrics chart (ApexCharts, shows day metrics over time — weight, calories, steps, etc.)
- Dashboard toggleable cards showing: next workout, today's metrics, weekly training summary, active block, upcoming events
- Weekly check-in history as proxy for progress tracking
- **NO dedicated progress/analytics page**
- **NO personal record (PR) tracking or display**
- **NO strength progress charts beyond per-exercise sparkline**
- **NO volume load tracking**
- **NO body composition trend analysis**
- Key files: `src/app/user/(dashboard)/DashboardChart.tsx`, `src/app/user/workout/E1rmSparkline.tsx`

---

### 10. Coach-Client Features
**Status: Fully implemented**
- Coach mode activation (generates unique 6-digit code; retries up to 10 times on collision)
- Client links via `/coach/[code]` URL
- Coach request → accept/reject flow
- Coach views pending requests, confirmed clients
- Coach reviews client check-ins with notes
- Coach email alert on client check-in
- Coach creates training plans for clients
- Coach views client plans, nutrition, supplements
- Client can unlink coach; coach can remove client
- Key files: `src/app/coach/`, `src/app/user/coach/`, `src/app/api/coach/`

**Issues:**
- One coach per athlete (no multiple coaches or trainer networks)
- No client progress comparison view for coaches
- No coach messaging system beyond check-in notes
- No coach analytics dashboard

---

### 11. Settings
**Status: Fully implemented**
- Dashboard card visibility toggles (6 cards)
- Workout stopwatch toggle
- Feature flags (supplements)
- Check-in day selection (Mon–Sun)
- Coaching settings: activate/deactivate, show code, manage pending/confirmed clients/requests
- Settings stored as JSON column on User; merged via `PATCH /api/user/settings`
- Key files: `src/app/user/settings/`, `src/lib/providers/SettingsProvider.tsx`, `src/types/settingsTypes.ts`

**Issues (SettingsProvider):**
- Race condition: rapid setting changes could arrive out-of-order and revert
- No request deduplication

---

### 12. Notifications & Communications
**Status: Fully implemented**
- Email notifications via MailerSend (bug reports, check-in coach alerts, weekly reminders)
- Web push notifications (VAPID; reminder delivery)
- Vercel cron job (`0 7 * * *`) for weekly check-in reminders
- Push subscription management (`api/push/subscribe`)
- Key files: `src/lib/notifications.ts`, `src/app/api/cron/check-in-reminders/`, `src/lib/usePushSubscription.ts`

**Issues:**
- Silent failures when env vars missing (no logging)
- No user-facing notification preference settings beyond reminder day

---

### 13. Offline Support
**Status: Partially implemented**
- IndexedDB cache (clientDb) for workout data hydration
- Request queue with exponential backoff retry
- `NetworkStatusBanner` shows offline state and pending request count
- Background Sync API attempted (with `@ts-expect-error` workaround)
- Key files: `src/utils/clientDb.ts`, `src/utils/offlineSync.ts`, `src/lib/hooks/useOfflineCache.ts`, `src/components/NetworkStatusBanner.tsx`

**Issues:**
- `NetworkStatusBanner`: stray `console.log`; incorrect dependency array causes listener re-registration on every queue count change
- `offlineSync.ts`: double `console.error` on line 60-61; `console.log` for successful syncs; no jitter in backoff; no request validation before send
- `useOfflineCache.ts`: cache load errors silently suppressed with `console.error`; no error state exposed to caller
- DB versioning at v2 with no migration logic for future schema changes

---

### 14. Video Library (`/library`)
**Status: BROKEN / PLACEHOLDER**
- Page exists at `/library` route
- Shows 12 hardcoded YouTube videos — all Vietnam travel content (caves, rice paddies, water buffalo, boats)
- No relation to fitness, exercise, or the app's purpose
- Not linked from the main navigation (AppBar)
- No auth required to access
- Almost certainly placeholder content from developer personal use — should be removed or repurposed
- Key file: `src/app/library/page.tsx`

---

### 15. Bug Reporting
**Status: Fully implemented**
- In-app form at `/report-bug`
- Optional screenshot upload (max 5MB, JPEG/PNG/GIF/WebP)
- Sends email via MailerSend
- Auth optional (uses session if available)
- Key files: `src/app/report-bug/`, `src/app/api/report-bug/`

---

## PHASE 1B — QUALITY & POLISH SCORECARD

| Feature Area | Functionality | Polish | Performance | Completeness | Notes |
|---|:---:|:---:|:---:|:---:|---|
| Auth/Login | 5 | 4 | 5 | 4 | Clean; Google + demo works well |
| Workout Tracking | 5 | 4 | 4 | 4 | Core UX solid; reducer complexity high |
| Plan Management | 5 | 4 | 4 | 5 | AI import is a differentiator; CSV parser is rough |
| Exercise Library | 4 | 3 | 4 | 3 | No rich exercise content; discovery weak |
| Calendar & Events | 4 | 4 | 3 | 4 | FullCalendar heavy; no recurring events |
| Nutrition Tracking | 4 | 4 | 4 | 3 | Manual entry only; no food DB |
| Supplements | 4 | 3 | 4 | 3 | Feature-flagged; free-text only |
| Weekly Check-in | 4 | 4 | 4 | 4 | No progress photos; no body measurements |
| Analytics/Progress | 2 | 2 | 3 | 2 | Major gap; no PR tracking, no progress page |
| Coach-Client | 4 | 3 | 4 | 4 | Solid foundation; no messaging or bulk views |
| Settings | 4 | 4 | 4 | 4 | Good; race condition in provider |
| Notifications | 4 | 4 | 4 | 4 | Silent failures possible |
| Offline Support | 3 | 3 | 3 | 3 | Works but has bugs; no real BG sync |
| Video Library | 0 | 1 | 3 | 0 | **Placeholder travel content; must remove** |
| Bug Reporting | 5 | 4 | 4 | 5 | Solid implementation |
| **OVERALL** | **3.9** | **3.5** | **3.9** | **3.5** | |

---

### Biggest Strengths

1. **Architecture is excellent.** API routes are thin and consistently structured. Auth patterns (requireSession, getWorkoutWithOwner ownership chains) are well-enforced everywhere. Zod validation throughout. No sloppy one-off patterns.

2. **AI plan import is a genuine differentiator.** Claude-powered plan generation with rate limiting, request size caps, and a clean structured output schema is more sophisticated than anything competitors offer at this price point.

3. **Coach-client feature is production-ready.** The full invitation/acceptance flow, check-in review, notes, and cross-account data access is solid and well-secured.

4. **Plan editor is powerful.** Drag-and-drop, template library, AI import, and CSV upload covering multiple creation paths is better than most indie workout apps.

5. **Type safety and tooling discipline.** Strict TypeScript, Zod schemas, Husky pre-commit with full test+lint+build checks — the codebase doesn't rot.

### Biggest Weaknesses

1. **Analytics/progress is the biggest gap.** There's no personal record tracking, no strength progress charts, no volume/load analytics, and no body composition trends. Users have no way to see if they're improving over time. This is table-stakes for a fitness app.

2. **The video library page is embarrassing.** 12 Vietnam travel videos hardcoded in a public route. Must be removed or replaced before any serious user encounters it.

3. **Nutrition is manual-entry only.** No food database, no meal structure, no macro splits by day type. Competitive apps have full food databases with barcode scanners.

4. **Offline support is leaky.** The implementation exists but has race conditions, silent failures, and console noise. A broken offline mode is sometimes worse than none.

5. **sheetUpload.ts is a liability.** `@ts-nocheck`, incomplete validation, naive CSV parser — if users upload malformed CSVs, behavior is undefined.

6. **No social layer whatsoever.** No sharing, leaderboards, community, or even basic export. Users are fully siloed.

---

## PHASE 2 — COMPETITIVE RESEARCH

### Methodology

19 apps researched across 4 categories. Focus: feature coverage, pricing model, target user, and what each does better or worse than Forti.

---

### Category 1 — Strength Trackers (direct competitors)

| App | Pricing | Strengths | Weaknesses vs Forti |
|-----|---------|-----------|---------------------|
| **Strong** | $10/mo or $50/yr | Clean UX, watch app, reliable sync | No coach tools, no AI, no periodization |
| **Hevy** | Free (unlimited) + $10/mo Pro | Social feed, web app, public API, best free tier | No blocks, no check-ins, coach tier is basic |
| **JEFIT** | Free + $8/mo | Massive exercise library, community routines | Dated UI, cluttered, no periodization |
| **GymBook** | $5.99 one-time | No subscription, local-first, watch | No web app, no coach, limited analytics |
| **Liftoff** | $80/yr | Gamified XP, good UX | No coach, no periodization, high price |
| **Setgraph** | Free + $5/mo | Exercise-centric, fast logging, good charts | No blocks, no coach, no check-ins |

**Closest threat:** Hevy — unlimited free tier with a web app. Forti must win on depth (AI, blocks, coach).

---

### Category 2 — Coach Platforms

| App | Pricing | Strengths | Weaknesses vs Forti |
|-----|---------|-----------|---------------------|
| **TrueCoach** | $19–$119/mo | Cleanest coach UX, messaging, video, habit tracking | No AI programming, no periodization blocks, no check-in forms |
| **TrainHeroic** | $20+/mo | Marketplace, team calendar, leaderboards | Complex, no AI, no personal training tools |
| **TeamBuildr** | Enterprise | Institutional S&C scale | Not for individual coaches or small gyms |

**Key insight:** No coach platform has AI-generated programming or structured bulk/cut/deload blocks. Forti is ahead here.

---

### Category 3 — AI Coaching Apps

| App | Pricing | Strengths | Weaknesses vs Forti |
|-----|---------|-----------|---------------------|
| **Fitbod** | $13/mo | Frictionless, equipment-aware, recovery model | Weak periodization, no coach, no blocks |
| **Alpha Progression** | ~$5/mo | Best value AI, exercise quality ratings, progression logic | No coach, no check-ins, no blocks |
| **Juggernaut AI** | $15/mo | RPE autoregulation, true periodization | Powerlifting-only, no coach UX, no web app |
| **Dr. Muscle** | $30/mo | DUP + AI chat, PhD-backed, adaptive | Very expensive, no coach, individuals only |

**Key insight:** AI coaching apps have no coach-client layer. Forti uniquely bridges both.

---

### Category 4 — Broad / Indie

| App | Notes |
|-----|-------|
| **Boostcamp** | Free, 10k+ community programs (Reddit-sourced), auto-progression. No coach. Best for following established programs. |
| **Strava** | Endurance social graph. Strength is an afterthought. No periodization. |
| **Apple Fitness+ / Nike Training Club** | Guided video workouts. Not trackers. No data ownership. |

---

### Forti's Competitive Position

**Forti's exact combination does not exist elsewhere:**
- Coach-client relationship model ✓
- AI plan generation ✓
- Structured training blocks (Bulk/Cut/Deload) ✓
- Weekly check-in forms with subjective metrics ✓
- Web-first (no app install required) ✓

No single competitor has all five. Nearest overlaps:
- Hevy Coach: coach tools but no AI, no blocks, no check-ins
- TrueCoach: best coach UX but no AI, no periodization
- Juggernaut AI: real periodization but no coach layer

**Defensible moat:** AI-generated periodized programs routed through a coach-approval layer with subjective check-in data. Genuinely novel.

**Biggest competitive risk:** Hevy's free unlimited tier. Self-coached users without block/check-in needs find Hevy hard to beat on price.

---

### Competitive Gaps (features competitors have that Forti lacks)

| Feature | Competitors that have it | Priority |
|---------|--------------------------|---------|
| Progress charts / PR tracking | Hevy, Strong, Setgraph, Alpha Progression | **Critical** |
| Exercise descriptions / muscles | Hevy, JEFIT, Strong | Medium |
| Body measurements in check-in | TrueCoach | Medium |
| Progress photos | TrueCoach, most coach apps | Medium |
| Coach analytics dashboard | TrueCoach, TrainHeroic | Medium |
| Calendar export (iCal) | Strava, TrainHeroic | Low |
| Social / sharing | Hevy, Strava | Low |

---

## PHASE 3A — COMPETITIVE COMPARISON MATRIX

Legend: ✅ Full  ⚠️ Partial  ❌ None

Competitors selected: **Forti**, Hevy, Strong, TrueCoach, TrainHeroic, Fitbod, Alpha Progression, Juggernaut AI, Boostcamp, Setgraph

| Feature Category | Forti | Hevy | Strong | TrueCoach | TrainHeroic | Fitbod | Alpha Prog. | Juggernaut | Boostcamp | Setgraph |
|---|---|---|---|---|---|---|---|---|---|---|
| **Workout logging & tracking** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Exercise library / custom** | ✅ | ✅ | ✅ | ⚠️ | ✅ | ✅ | ✅ | ⚠️ | ✅ | ✅ |
| **Program / routine builder** | ✅ | ⚠️ | ⚠️ | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ | ❌ |
| **Periodization / training blocks** | ✅ | ❌ | ❌ | ❌ | ⚠️ | ❌ | ⚠️ | ✅ | ⚠️ | ❌ |
| **Progressive overload tracking** | ⚠️ | ✅ | ✅ | ❌ | ⚠️ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Analytics & progress charts** | ❌ | ✅ | ✅ | ⚠️ | ✅ | ⚠️ | ✅ | ⚠️ | ❌ | ✅ |
| **PR / 1RM tracking** | ⚠️* | ✅ | ✅ | ❌ | ✅ | ⚠️ | ✅ | ✅ | ⚠️ | ✅ |
| **Volume / tonnage analytics** | ❌ | ✅ | ⚠️ | ❌ | ✅ | ❌ | ✅ | ⚠️ | ❌ | ✅ |
| **Social / community** | ❌ | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ⚠️ | ❌ |
| **AI / auto-programming** | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Coaching / client management** | ✅ | ⚠️ | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Weekly check-in / subjective data** | ✅ | ❌ | ❌ | ⚠️ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Body metrics / measurements** | ⚠️** | ⚠️ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Nutrition tracking / integration** | ⚠️*** | ❌ | ❌ | ⚠️ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Recovery / readiness tracking** | ⚠️ | ❌ | ❌ | ⚠️ | ❌ | ✅ | ⚠️ | ✅ | ❌ | ❌ |
| **Wearable / device integration** | ❌ | ❌ | ⚠️ | ❌ | ⚠️ | ⚠️ | ❌ | ❌ | ❌ | ❌ |
| **Calendar view** | ✅ | ❌ | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Offline support** | ⚠️ | ✅ | ✅ | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Push notifications / reminders** | ✅ | ⚠️ | ⚠️ | ✅ | ✅ | ✅ | ⚠️ | ❌ | ⚠️ | ❌ |
| **Import / export data** | ⚠️ | ⚠️ | ✅ | ❌ | ⚠️ | ❌ | ⚠️ | ❌ | ❌ | ❌ |
| **Web app (no install)** | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Watch / wearable app** | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Onboarding flow** | ⚠️ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ⚠️ | ✅ | ⚠️ |
| **Free tier** | ❌ | ✅ | ❌ | ❌ | ❌ | ⚠️ | ❌ | ❌ | ✅ | ✅ |

**Notes:**
- `*` Forti stores E1RM sparkline data but has no dedicated PR page or PR history view
- `**` Forti has a weight field in day metrics but no structured measurement tracking (waist, arms, etc.)
- `***` Forti has macro targets in day metrics but no food database or meal logging

### Matrix Summary

**Forti's unique cells** (features no competitor has combined):
- Periodization blocks + coach management + AI programming + check-in forms + web-first: **zero competitors match this combination**

**Forti's critical gaps** (✅ for 5+ competitors, ❌ for Forti):
- Analytics & progress charts — 8/10 competitors have this; Forti has none
- Volume / tonnage analytics — 4/10 have this; Forti has none
- PR / 1RM dedicated tracking — 7/10 have this; Forti has sparklines only

**Forti is competitive on:**
- Calendar view (rare feature — only TrueCoach and TrainHeroic match)
- Push notifications (most competitors skip this)
- Weekly check-in / subjective data (unique to Forti)
- Training blocks / periodization (only Juggernaut AI matches; no coach app has this)

---

## PHASE 3B — FEATURE RECOMMENDATIONS

### Improvements to Existing Features

Ordered by impact vs. effort:

| # | Feature | Improvement | Impact | Effort | Priority |
|---|---------|-------------|--------|--------|----------|
| 1 | **E1RM / Progress** | Build a dedicated Progress page: per-exercise PR history table, E1RM trend chart, volume-over-time chart. Data already exists in DB via `ExerciseSet`. | High | Medium | Must-have |
| 2 | **Workout logging** | Add a rest timer (countdown between sets). Every major competitor has this. Minimal state, no DB changes needed. | High | Small | Must-have |
| 3 | **Check-in form** | Add body measurement fields (weight, waist, chest, arms, hips) to `WeeklyCheckIn`. Schema change + form update. | High | Small | Must-have |
| 4 | **Offline support** | Fix stale event listener, double `console.error`, add jitter to backoff. The implementation is mostly there — just leaky. | High | Small | Must-have |
| 5 | **Mobile plan editing** | Implement drag-reorder on mobile (currently disabled with a TODO). MUI supports touch events on drag. | High | Medium | Must-have |
| 6 | **Onboarding** | Add a guided first-use flow: create first plan → add workout → log first set. Currently drops users at an empty dashboard. | High | Medium | Should-have |
| 7 | **Coach dashboard** | Add client progress charts and PR history to the coach check-in view. Reuse components from the Progress page (item 1). | Medium | Small | Should-have |
| 8 | **Exercise detail** | Surface exercise description, primary muscles, and equipment in the workout and exercise library views. Data fields exist in the `Exercise` model. | Medium | Small | Should-have |
| 9 | **Settings UX** | Fix SettingsProvider race condition (stale closure). Also replace `alert()` in PlanTable with MUI `Dialog`. | Medium | Small | Should-have |
| 10 | **sheetUpload.ts** | Rewrite: remove `@ts-nocheck`, add Zod validation, replace dummy IDs with real UUIDs, handle malformed CSV gracefully. | Medium | Small | Should-have |
| 11 | **Export** | Add CSV/JSON export for workout history. Strong does this; users expect data portability. | Low | Small | Nice-to-have |
| 12 | **Calendar** | Add recurring event support (e.g. weekly weigh-in). Schema change: add `recurrence` field to `Event`. | Low | Medium | Nice-to-have |

---

### New Feature Ideas

| # | Feature | Description | Why it matters | Complexity | Priority | Technical notes |
|---|---------|-------------|----------------|------------|----------|-----------------|
| 1 | **Progress & Analytics page** | Dedicated `/user/progress` page: PRs by exercise, E1RM history chart, weekly volume chart, body weight trend. | Table-stakes — every competitor has charts. Without this, users can't see if they're improving. | Medium | Must-have | Reuse `E1rmSparkline`, `DashboardChart`. Query `ExerciseSet` grouped by exercise + week. |
| 2 | **Rest timer** | In-workout countdown timer between sets. Auto-starts after logging a set, configurable per exercise. | Standard expectation; Strong/Hevy/GymBook all have this. High gym-floor utility. | Small | Must-have | Extend `StopwatchContext` or add a new `RestTimerContext`. No DB changes. |
| 3 | **Progress photos in check-in** | Allow photo upload in weekly check-in. Coach can view alongside subjective data. | Coaches use photos as the primary visual progress signal. TrueCoach's standout feature. | Medium | Should-have | Upload to Vercel Blob or S3. Add `photoUrl` field to `WeeklyCheckIn`. |
| 4 | **Body measurements** | Structured measurement tracking (waist, chest, arms, hips) in check-in and on a dedicated trend chart. | Completes the check-in picture. Coaches need this alongside weight and subjective ratings. | Small | Should-have | Add measurement columns to `WeeklyCheckIn` schema. Extend check-in form + coach view. |
| 5 | **Plate calculator** | Given a target weight, show which plates to load on a barbell (configurable bar weight). | Gym-floor utility tool. Popular in Strong/GymBook. Zero DB involvement. | Small | Should-have | Pure client-side utility component. Accessible from workout set input. |
| 6 | **Coach analytics dashboard** | Coaches see client PR history, volume trends, body weight trend — not just check-in notes. | Coach value prop is insight. Right now coaches see words; they need data. | Medium | Should-have | Reuse Progress page components. Scope to `api/coach/clients/[clientId]` data. |
| 7 | **AI plan chat / revision** | After AI-generating a plan, allow the user to send follow-up messages ("make it a 4-day split", "add more leg volume"). | Alpha Progression and Dr. Muscle both support conversational refinement. Closes a UX gap in the AI import flow. | Medium | Should-have | Extend `api/plan/ai-import`. Add a conversation thread UI before finalizing the plan. |
| 8 | **Workout templates** | Save any workout as a reusable template, separate from a plan. Useful for drop-in gym sessions. | Boostcamp popularised this. Users want to run ad-hoc workouts without building a full plan. | Medium | Nice-to-have | New `WorkoutTemplate` model or reuse existing `Workout` with a `isTemplate` flag. |
| 9 | **Calendar export (iCal)** | Export training blocks as `.ics` file or sync to Google Calendar / Apple Calendar. | Users want to see their bulk/cut phases in their main calendar. | Small | Nice-to-have | Generate iCal from `Event` and `Week` data. No external API needed. |
| 10 | **Multiple coaches** | Allow an athlete to be linked to more than one coach. | Team S&C environments (e.g. a strength coach + a conditioning coach). | Large | Nice-to-have | Schema change: many-to-many `User ↔ User` via `CoachClientLink` join table. |

---

## PHASE 3C — STRATEGIC POSITIONING

### Positioning Strategy Options

#### Option A: "AI-Powered Coach Platform"
**Emphasis:** Lead with the coach-client relationship + AI programming combination. Target small coaching businesses (1–20 clients). Price at $30–50/mo for coaches, free for athletes.

**What to build:** Progress page, coach analytics dashboard, progress photos, AI plan chat/revision, body measurements, plate calculator.
**What to defer:** Social, food DB, wearables, multi-coach.
**Competitive moat:** No other app routes AI-generated periodized programming through a coach review layer. TrueCoach has coach UX but zero AI; Juggernaut AI has programming but zero coach tools.
**Risk:** Small TAM if constrained to coached athletes. Coaches are the sales bottleneck — one coach brings 10–20 users.

---

#### Option B: "The Serious Lifter's Toolkit"
**Emphasis:** The deepest, most data-rich self-coaching tool for intermediate-advanced lifters. No fluff. Web-first, no app required.

**What to build:** Progress page, rest timer, plate calculator, volume analytics, workout templates, AI chat/revision, better onboarding.
**What to defer:** Coach tools (keep but don't lead with), social, food DB.
**Competitive moat:** Periodization blocks + AI programming in a web app with no install barrier. Hevy has the free tier but no blocks or AI. Juggernaut AI has programming depth but mobile-only and powerlifting-specific.
**Risk:** Hevy's free tier is a constant gravitational pull. Must justify subscription with genuine depth.

---

#### Option C: "The All-in-One Fitness OS"
**Emphasis:** Workout + nutrition + coach + AI + check-in + calendar in one platform. Compete with the fragmented "I use 4 apps" problem.

**What to build:** Everything — food database, wearable sync, social features, full analytics, measurements, photos.
**What to defer:** Nothing — ambitious scope.
**Competitive moat:** Theoretical completeness.
**Risk:** This is a 3-year roadmap. High execution risk. No team achieves "all-in-one" without serious resources. MyFitnessPal tried and became bloated. Not recommended.

---

### Recommended Strategy: **Option A with Option B depth**

Lead with the coach platform angle (Option A) because:
1. Coaches are a high-value acquisition channel — one coach brings 10–20 paying athletes
2. The moat is genuinely defensible — no competitor has this exact stack
3. The weekly check-in + block system is already built; it just needs analytics to make it shine

Build Option B's depth features (progress page, rest timer, plate calculator, volume analytics) because they serve both self-coached and coached athletes, and they're table-stakes for any serious lifter.

---

### Recommended 3–6 Month MVP Roadmap

**Month 1 — Fix the floor**
- Remove `/library` Vietnam video page (P0)
- Fix offline bugs, settings race condition, `alert()` replacement (quick wins)
- Rewrite `sheetUpload.ts` (reliability)
- Add body measurement fields to check-in (small schema change, high coach value)

**Month 2 — Fill the critical gap**
- Build Progress & Analytics page (`/user/progress`): PR history, E1RM chart, body weight trend
- Add rest timer to workout interface
- Add plate calculator

**Month 3 — Coach value prop**
- Add progress photos to check-in
- Build coach analytics dashboard (reuse Progress page components)
- Add check-in E2E tests + fix mobile plan drag-reorder

**Month 4–6 — Differentiate**
- AI plan chat / revision (conversational refinement)
- Workout templates
- Improve onboarding (guided first-use flow)
- Coach analytics v2 (volume charts, block timeline)

**Defer indefinitely (revisit at scale):**
- Food database / barcode scanner
- Wearable integration
- Social / leaderboards
- Multiple coaches per athlete

---

### Moats & Differentiators Worth Building

1. **Coach + AI + periodization loop** — AI generates a block-aware plan, coach reviews and approves, athlete executes, weekly check-in feeds back to AI for next block. No competitor has all four nodes of this loop. Building it deeply creates switching cost for both coach and athlete.

2. **Check-in as a longitudinal dataset** — Every week a user submits energy, mood, stress, sleep, recovery ratings alongside body metrics. After 6 months this is a rich dataset nobody else has. Future: correlate check-in scores with performance to surface "you lift best when your sleep score is 4+"—a feature no competitor offers.

3. **Web-first for coaches** — Coaches assign, review, and communicate from a browser. No app install for the coach. TrainHeroic and TrueCoach are mobile-heavy. A polished web experience is underserved in this market.

4. **Open API / public athlete profiles** — Long-term: let athletes share their training history publicly (like Strava routes). Organic SEO + social proof flywheel. Hevy has this; nobody in the coach-platform space does.

---

## PHASE 3 — ROADMAP (P0–P3 Issues)

### Priority Framework

- **P0:** Blocking (broken, embarrassing, must fix before any demo)
- **P1:** Core product gaps (table-stakes features every competitor has)
- **P2:** Differentiator improvements (deepen Forti's unique value)
- **P3:** Future / nice-to-have

---

#### P0 — Immediate

| # | Issue | Files | Why |
|---|-------|-------|-----|
| 1 | **Remove Vietnam travel video library** | `src/app/library/page.tsx` | Public route showing unrelated content |

---

#### P1 — High Priority

| # | Issue | Files | Why |
|---|-------|-------|-----|
| 2 | **Progress & Analytics page** | New `src/app/user/progress/`; reuse `E1rmSparkline`, `DashboardChart` | Table-stakes; every competitor has this |
| 3 | **Fix sheetUpload.ts** | `src/utils/sheetUpload.ts` | `@ts-nocheck`, dummy IDs, naive CSV parser — data integrity risk |
| 4 | **Fix offline support bugs** | `src/utils/offlineSync.ts`, `NetworkStatusBanner.tsx`, `useOfflineCache.ts` | Broken offline is worse than none |
| 5 | **Fix SettingsProvider race condition** | `src/lib/providers/SettingsProvider.tsx` | Rapid changes cause visible revert |
| 6 | **Add check-in E2E tests** | `tests/e2e/check-in.test.ts`, `tests/e2e/coach-review.test.ts` | Major user flow with zero test coverage |
| 7 | **Mobile plan drag-reorder** | `src/app/user/plan/MobilePlanView.tsx` | Disabled on mobile with a TODO |
| 8 | **Replace alert() in PlanTable** | `src/app/user/plan/PlanTable.tsx:29` | Native dialog breaks MUI app UX |

---

#### P2 — Medium Priority

| # | Issue | Files | Why |
|---|-------|-------|-----|
| 9 | **Progress photos in check-in** | `CheckInForm.tsx`, new `api/check-in/photo` | Primary progress signal for coaches |
| 10 | **Body measurements in check-in** | `prisma/schema.prisma`, `CheckInForm.tsx` | Coaches need measurements alongside ratings |
| 11 | **Missing schema indexes** | `prisma/schema.prisma` | `Plan`, `Week`, `Workout`, `DayMetric` lack parent-lookup indexes |
| 12 | **Coach analytics dashboard** | `src/app/user/coach/check-ins/` | Coaches need charts, not just notes |
| 13 | **Rich exercise content** | `src/app/exercises/`, `ExerciseDetailView.tsx` | Description/muscles data exists but isn't shown |
| 14 | **Nutrition targets by training block** | `src/app/user/nutrition/`, `prisma/schema.prisma` | Flat daily targets don't match cut/bulk phases |

---

#### P3 — Low Priority

| # | Issue | Why |
|---|-------|-----|
| 15 | **Food database integration** | Competitive gap; out of scope for v1 |
| 16 | **Calendar export (iCal)** | Users want blocks in their main calendar |
| 17 | **Recurring calendar events** | Weekly weigh-in use case |
| 18 | **Multiple coaches per athlete** | Team environments |
| 19 | **Social / sharing layer** | Long-term growth mechanic |

---

## PHASE 4 — FINAL PLAN

### Context

A comprehensive audit of the Forti codebase was performed covering all 15 feature areas, architecture, test coverage, and technical debt. Phase 2 competitive research confirmed Forti's combination (AI programming + coach-client + training blocks + check-ins + web-first) has no direct competitor, but that a progress/analytics page is a critical gap every competitor has.

The output is a `ROADMAP.md` file committed to `claude/app-audit-roadmap-bhToQ`.

### What will be created

**File:** `ROADMAP.md` (repo root)

**Contents:**
1. Executive summary (current state, competitive position, critical gap)
2. Strengths to preserve
3. P0–P3 priority tables (19 items total, each with problem, files, acceptance criteria)

### Files to create

- `/home/user/forti/ROADMAP.md` — new file

### No source files modified

Pure documentation deliverable.

### Commit & push

```bash
git add ROADMAP.md
git commit -m "docs: add prioritized app audit roadmap"
git push -u origin claude/app-audit-roadmap-bhToQ
```

### Verification

- `ROADMAP.md` exists at repo root and renders correctly on GitHub
- All 19 items present with file references and acceptance criteria
- Scannable at a glance (tables, clear headers)
- Branch pushed and visible at `claude/app-audit-roadmap-bhToQ`

---

### Roadmap Structure

Items are grouped into four priority tiers. Each item includes the problem, affected file(s), and success criteria.

---

#### P0 — Immediate (Blocking; fix before any marketing or demo)

| # | Issue | Files | Why |
|---|-------|-------|-----|
| 1 | **Remove Vietnam travel video library** — `/library` route shows 12 unrelated travel videos | `src/app/library/page.tsx` | Visible to unauthenticated users; embarrassing if encountered |

---

#### P1 — High Priority (Core product gaps)

| # | Issue | Files | Why |
|---|-------|-------|-----|
| 2 | **Progress & Analytics page** — No PR tracking, no strength charts, no volume analytics | New page at `src/app/user/progress/`; reuse `E1rmSparkline`, `DashboardChart` | Table-stakes for any fitness app; users can't see if they're improving |
| 3 | **Fix sheetUpload.ts** — `@ts-nocheck`, naive CSV parser, TODOs, dummy IDs | `src/utils/sheetUpload.ts` | Data integrity risk; malformed CSVs cause undefined behavior |
| 4 | **Fix offline support bugs** — stale listener, double console.error, no jitter in backoff | `src/utils/offlineSync.ts`, `src/components/NetworkStatusBanner.tsx`, `src/lib/hooks/useOfflineCache.ts` | Broken offline is worse than no offline |
| 5 | **Fix SettingsProvider race condition** — rapid setting changes can arrive out-of-order | `src/lib/providers/SettingsProvider.tsx` | Users can see their toggles revert |
| 6 | **Add check-in E2E tests** — no test coverage for check-in submission or coach review | `tests/e2e/check-in.test.ts`, `tests/e2e/coach-review.test.ts` | Major user flow untested |
| 7 | **Mobile plan edit mode** — drag-reorder disabled on mobile; "todo" in test file | `src/app/user/plan/MobilePlanView.tsx` | Plan editing broken on primary platform |
| 8 | **Replace alert() in PlanTable** — native `alert()` breaks UX consistency | `src/app/user/plan/PlanTable.tsx:29` | Jarring native dialog vs MUI app |

---

#### P2 — Medium Priority (Polish & feature completeness)

| # | Issue | Files | Why |
|---|-------|-------|-----|
| 9 | **Progress photos in check-in** — no photo upload in weekly check-in | `src/app/user/check-in/CheckInForm.tsx`, new `api/check-in/photo` route | Athletes and coaches use photos as primary progress signal |
| 10 | **Body measurements in check-in** — no waist, arms, chest fields | `prisma/schema.prisma`, `src/app/user/check-in/CheckInForm.tsx` | Coaches need measurements alongside subjective ratings |
| 11 | **Add missing schema indexes** — `Plan`, `Week`, `Workout`, `DayMetric` lack parent-lookup indexes | `prisma/schema.prisma` | Performance degrades with more users/data |
| 12 | **Coach analytics dashboard** — coaches can't see client progress charts or PR history | `src/app/user/coach/check-ins/` | Coach value prop is insight, not just notes |
| 13 | **Rich exercise content** — description, equipment, muscles shown in exercise library but not detail view | `src/app/exercises/`, `src/app/user/workout/ExerciseDetailView.tsx` | Library data is there; UI doesn't surface it |
| 14 | **Nutrition targets by training block** — targets are per-day flat; no block-aware cycling | `src/app/user/nutrition/`, `prisma/schema.prisma` | Cut/bulk require different macros automatically |

---

#### P3 — Low Priority (Nice to have / future)

| # | Issue | Files | Why |
|---|-------|-------|-----|
| 15 | **Food database integration** — manual macro entry; no food search | New service integration or `src/app/user/nutrition/` | Competitive gap vs MyFitnessPal-style apps |
| 16 | **Calendar export (iCal / Google Calendar sync)** — no export | `src/app/api/calendar-data/`, new `/api/export/ical` route | Users want training blocks in their main calendar |
| 17 | **Recurring calendar events** — no repeat option on custom events | `src/app/user/calendar/`, `prisma/schema.prisma` | Common user request for weekly weigh-ins etc. |
| 18 | **Multiple coaches per athlete** — one coach limit | `prisma/schema.prisma` (self-relation cardinality), coach API routes | Team environments need multi-coach support |
| 19 | **Social / sharing layer** — no plan sharing, leaderboards, or export | New features | Long-term growth mechanic |

---

### Deliverable

A `ROADMAP.md` file at the root of the repository, formatted with:
- Executive summary (3–4 sentences on current state)
- Priority tiers (P0–P3) with tables matching the above
- Each item: problem statement, affected files, acceptance criteria
- A "Strengths to preserve" section (so future contributors know what not to break)

---

## PHASE 4 — FINAL PLAN

### Context

A comprehensive audit of the Forti codebase was performed, covering all 15 feature areas, architecture, test coverage, and technical debt. The output is a prioritized roadmap to guide future development.

### What will be created

**File:** `ROADMAP.md` (repo root)

**Contents:**
1. Current state summary (strengths + critical gaps)
2. **P0 — Immediate** (1 item): Remove broken library page
3. **P1 — High Priority** (7 items): Progress page, offline fixes, test gaps, mobile edit, alert() fix, sheetUpload rewrite, settings race condition
4. **P2 — Medium Priority** (6 items): Progress photos, body measurements, schema indexes, coach dashboard, exercise content, nutrition by block
5. **P3 — Low Priority** (5 items): Food DB, calendar export, recurring events, multi-coach, social layer
6. "Strengths to preserve" section

### Files to create

- `/home/user/forti/ROADMAP.md` — new file

### No files to modify

The roadmap is a pure documentation deliverable; no source code changes.

### Commit & push

```bash
git add ROADMAP.md
git commit -m "docs: add prioritized app audit roadmap"
git push -u origin claude/app-audit-roadmap-bhToQ
```

### Verification

- `ROADMAP.md` exists and renders correctly on GitHub
- All 19 roadmap items are present with file references
- Document is scannable at a glance (tables, clear headers)
- Branch is pushed and visible at `claude/app-audit-roadmap-bhToQ`
