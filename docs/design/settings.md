# Forti · Signal — Settings screen

**Audience:** engineering agent implementing the Settings screen in the production codebase (`src/app/user/settings/`).
**Source of truth:** `stage5/signal-settings.jsx` in the design canvas — components `S_SettingsMobileLightHub`, `S_SettingsMobileLightDetail`, `S_SettingsDesktopTwoPane`, `S_SettingsDesktopCoach`. This document is the engineering-ready distillation.

Settings replaces the current single-scroll list in `SettingsClient.tsx` (signal branch) with **two distinct presentations** driven off viewport:

- **Mobile (< 1024 px):** A grouped **hub index** that drills into focused sub-screens.
- **Desktop (≥ 1024 px):** A **two-pane** layout — section rail on the left, content on the right.

Every feature in the current screen is preserved. Settings is reached via **More → Settings** in the existing Signal nav. The breadcrumb eyebrow inside Settings reads `SETTINGS · {GROUP}` (mobile sub-screens, desktop pane header). The 1024 px boundary is the existing `signalTokens.space.desktopBreakpointPx`, shared with the rest of the Signal shell.

---

## 1 · Tokens to reference (already exist in `@lib/signal/tokens`)

| Token | Hex | Notes |
| --- | --- | --- |
| `--bg-light` (`lBg`) | `#f4f2ec` | Page background |
| `--surface-light` (`lSurface`) | `#ffffff` | Card / row background |
| `--surface-light-alt` (`lSurfaceAlt`) | `#faf8f2` | Mode-pill bg, avatar bg, active-row bg |
| `--ink` (`lInk`) | `#15140f` | Primary text, segmented active fill, section-rail active rule |
| `--ink-mid` (`lInkMid`) | `#5e5b53` | Secondary text, glyph stroke |
| `--ink-light` (`lInkLight`) | `#8c887d` | Mono labels, eyebrows, chevron `›` |
| `--border-light` (`lBorder`) | `#dcd7c8` | Hairline dividers |
| `--border-light-strong` (`lBorderStrong`) | `#2a2823` | Input border (focused / dirty) |
| `--signal` (`signal`) | `#d4f24a` | Toggle-on fill, BETA badge text |
| `--signal-deep` (`signalDeep`) | `#9bc41a` | Top-page eyebrow accent, toggle border |
| `--ok` | `#5a8c4f` | Linked-coach status dot |
| `--urgent` | `#b14a35` | Unlink + Sign-out button stroke/text |

**Fonts** (already loaded): `Inter Tight` (UI), `Archivo Narrow` (condensed display), `JetBrains Mono` (labels, numerals).

**Radii:** card `4px`, input/segmented `3px`, glyph chip `3px`, toggle `9px`.

---

## 2 · Routing & navigation

```
/user/settings                    → mobile: hub          desktop: rail + Profile pane
/user/settings/profile            → mobile: sub-screen   desktop: rail + Profile pane
/user/settings/dashboard          → mobile: sub-screen   desktop: rail + Dashboard pane
/user/settings/workout            → mobile: sub-screen   desktop: rail + Workout pane
/user/settings/tracked            → …
/user/settings/metrics            → …
/user/settings/checkin            → …
/user/settings/units              → …
/user/settings/onboarding         → …
/user/settings/coach              → mobile: sub-screen   desktop: rail + Coaching pane
/user/settings/export             → …
/user/settings/signal             → …
/user/settings/signout            → confirm modal (not its own pane)
```

**Drive presentation off viewport, not URL.** A user resizing from 1200 → 600 should see the same data in the appropriate presentation without a redirect. The viewport breakpoint is the shared `signalTokens.space.desktopBreakpointPx` (1024 px).

- On mobile, `/user/settings` renders the hub; `/user/settings/:section` renders that sub-screen.
- On desktop, `/user/settings` and `/user/settings/:section` both render the two-pane layout; the URL drives which item is active in the rail. `/user/settings` with no section selects `profile` by default.

Settings is reached from **More → Settings** in the existing Signal secondary nav. The breadcrumb inside Settings reads `SETTINGS · {GROUP}` — the `MORE · ACCOUNT` wording from earlier drafts is dropped; there is no separate Account hub.

---

## 3 · Mobile — hub index

> **Group structure unified with desktop:** ACCOUNT / TRAINING / COACHING / DATA. Earlier drafts used a mobile-only "COACHED / ADVANCED" split — that's been dropped. The optional status suffix on the COACHING group title (e.g. `COACHING · ONE PENDING`) is preserved.
>
> **Top bar:** the hub renders inside the existing `SignalTopBar` (52 px) — no Settings-specific top bar. Sub-screens (§4) layer a 44 px breadcrumb strip beneath the SignalTopBar with the back chevron and breadcrumb.

```
┌───────────────────────────────────────────┐
│  (SignalTopBar — brand, Train|Coach pill) │
├───────────────────────────────────────────┤
│                                           │
│  SETTINGS · ALEX ROSEN  (signalDeep)      │
│  Everything                               │  ← Archivo Narrow 30/1.0, -0.015em
│  Tap a row to open it. Account-wide       │  ← Inter Tight 12, lInkMid
│  changes save instantly.                  │
│                                           │
│  ACCOUNT                                  │  ← mono 9, lInkLight, 0.16em
│  ┌─────────────────────────────────────┐  │
│  │ [⌬] Profile          Alex Rosen · ›│  │  ← row 48 px, 1px lBorder between
│  │ [⌬] Signal UI [BETA] On — opt-in ›│  │
│  │ [⌬] Sign out         Forti session›│  │
│  └─────────────────────────────────────┘  │
│                                           │
│  TRAINING                                 │
│  ┌─────────────────────────────────────┐  │
│  │ [⌬] Dashboard cards  6 of 7 on   ›│  │
│  │ [⌬] Workout defaults 4 of 4 · RPE ›│  │
│  │ [⌬] Tracked lifts    3 of 5      ›│  │
│  │ [⌬] Custom metrics   2 of 4      ›│  │
│  │ [⌬] Check-in day     Sunday      ›│  │
│  │ [⌬] Units            kg · kg     ›│  │
│  │ [⌬] Replay guide     Showing     ›│  │
│  └─────────────────────────────────────┘  │
│                                           │
│  COACHING · ONE PENDING                   │  ← optional suffix when sentRequest is Pending
│  ┌─────────────────────────────────────┐  │
│  │ [⌬] Your coach (●ok) Linked · M.H. ›│  │
│  │ [⌬] Coach mode       Off          ›│  │
│  └─────────────────────────────────────┘  │
│                                           │
│  DATA                                     │
│  ┌─────────────────────────────────────┐  │
│  │ [⌬] Export data      3 CSVs      ›│  │
│  └─────────────────────────────────────┘  │
│                                           │
├───────────────────────────────────────────┤
│ Home · Plan · Nutrition · Progress · More │  ← bottom nav (More active, 2px signal rule)
└───────────────────────────────────────────┘
```

### Row anatomy

- Container card: `1px solid --border-light`, radius 4, background `--surface-light`.
- Row height: `48 px` (≥ 44 px touch target). Padding `11 px 12 px`. Gap `12 px`.
- **Glyph chip** (left): 26×26, radius 3, background `--surface-light-alt`, 1px border `--border-light`. Stroke-1.5 SVG icon, 13 px, in `--ink-mid`.
- **Label** (centre): Inter Tight 13/600, `--ink`.
- **Value / status** (under label): JetBrains Mono 10, `--ink-light`, 0.02em tracking.
- **Optional badges to the right of the label** (inline, between label text and the row right edge):
    - Status dot: 6×6 round; colour from `--ok` / `--warn` / `--urgent` / `--signal`.
    - Tag: mono 8, `1px 5px`, background `--ink`, text `--signal`, radius 2 — used for `BETA` on Signal UI row.
- **Chevron** (right): `›`, 16 px, `--ink-mid`.

### Group title

Mono 9, `--ink-light`, letter-spacing `0.16em`, 6 px below previous card.
Examples: `ACCOUNT`, `TRAINING`, `COACHING`, `DATA`. The `COACHING` title may include a mobile-only status suffix (`· ONE PENDING`, `· DECLINED`) when the user has a pending or rejected coach request; otherwise just `COACHING`.

### Mode pill (top right)

The `Train | Coach` mode pill is rendered by the existing `SignalTopBar` (when `coachModeActive`) — Settings does not duplicate it. Tapping `Coach` silently switches modes per the Forti rule — no confirmation.

### Behaviour

| Action | Result |
| --- | --- |
| Tap row | Push `/user/settings/:section` |
| Back swipe / `‹` | `router.back()` (or fall back to More if direct deep-link) |
| Sign out row tap | Open confirm modal (`<Modal>` component) — do not navigate |
| Pull-to-refresh | No-op; settings are state-managed via `useSettings()` |

---

## 4 · Mobile — sub-screen

Every sub-screen follows the same shell. The `SignalTopBar` stays on top; the Settings sub-screen layers an additional 44 px breadcrumb strip beneath it with the back chevron.

```
┌───────────────────────────────────────────┐
│  (SignalTopBar 52 px — global)            │
│  ‹  SETTINGS · TRAINING                   │  ← Settings breadcrumb strip 44 px, mono 11
├───────────────────────────────────────────┤
│                                           │
│  HOME  (signalDeep)                       │
│  Dashboard cards                          │  ← Archivo Narrow 30/1.0
│  Choose which training summaries appear   │  ← Inter Tight 12, lInkMid, max 32 char/line
│  on Home. The order is fixed and built    │
│  around the single primary command.       │
│                                           │
│  6 / 7 ENABLED       Saved as you toggle  │  ← mono 10, lInkLight, justified
│                                           │
│  ┌─────────────────────────────────────┐  │
│  │ Next workout                  [●━━]│  │  ← toggle right, 1px lBorder rows
│  │   The hero command on Home.        │  │
│  │─────────────────────────────────── │  │
│  │ Today's metrics               [●━━]│  │
│  │   4-cell strip — weight, sleep…    │  │
│  │ …                                  │  │
│  └─────────────────────────────────────┘  │
│                                           │
├───────────────────────────────────────────┤
│ Home · Plan · Nutrition · Progress · More │
└───────────────────────────────────────────┘
```

### Sub-screen breadcrumb

Top bar mono 11, `--ink-light`, `0.12em`. Format: `SETTINGS · {GROUP}` where `{GROUP}` is the group from §3 (e.g. `TRAINING`, `ACCOUNT`, `COACHING`, `ADVANCED`, `DATA`). The back chevron is **always** present and always returns to the hub.

### Sub-screen header block

- **Eyebrow:** mono 10, `--signal-deep`, `0.14em`. Names the *page surface this setting affects*, not the section title — e.g. `HOME` for Dashboard cards, `WORKOUT` for Session defaults, `CHECK-IN` for Weekly timing. Helps the user know what they're changing.
- **Title:** Archivo Narrow 30/1.0, `-0.015em`, `--ink`.
- **Description:** Inter Tight 12, `--ink-mid`, 1.5 line-height, max ~3 lines.
- **Status strip:** justified row, mono 10, `--ink-light`. Left side: state count (e.g. `6 / 7 ENABLED`, `3 / 5 PICKED`, `2 / 4 USED`). Right side: persistence note (e.g. `Saved as you toggle`, `Saved 2s ago`).

### Section body — patterns by sub-screen

The sub-screen is *only* the controls for that section. Pick the matching pattern:

#### Pattern A — Toggle list

Used by: **Dashboard cards**, **Workout defaults (Stopwatch / Warmup / Plate calculator)**, **Supplements (Features)**.

Container card with horizontal dividers between rows. Each row:

- Padding `12 px 14 px`, gap 12.
- Label (Inter Tight 13/600, `--ink`).
- Sub-label (mono 10, `--ink-light`, 3 px below label) — one-line description of what this card does, see Mobile sub-screen example.
- Toggle right-aligned. **Toggle spec:** width 30, height 18, radius 9. Off: track `--border-light`, thumb `--surface-light`, border `--border-light-strong`. On: track `--signal`, thumb `--surface-light`, border `--signal-deep`. Thumb is 14×14, 1 px inset from track.

#### Pattern B — Segmented control

Used by: **Effort metric** (None / RPE / RIR), **Check-in day** (Mon-Sun), **Units** (kg/lbs, kg/lb/st).

- Container: 1px `--border-light`, radius 3, `flex` row, equal-width cells, hairline divider between cells.
- Cell: text-center, padding `8 px 0` (or `6 px 0` for the 7-day picker so all days fit), font-size 12 (11 for the 7-day picker).
- Active cell: fill `--ink`, text `--surface-light`, weight 600.
- Inactive: transparent, text `--ink-mid`, weight 500.
- Workout defaults sub-screen contains *both* a toggle list *and* an Effort-metric segmented — separated by an extra 12 px gap and a mono `EFFORT METRIC` label.

#### Pattern C — Picker list with add row

Used by: **Tracked lifts** (cap 5), **Custom metrics** (cap 4).

- Each existing item: 1px `--border-light` card, padding `9 px 14 px`, radius 3, name on the left, `×` (16 px, `--ink-mid`) right.
- Below items: an add-row — `1px dashed --border-light`, radius 3, padding `9 px 14 px`, mono 12 `--ink-mid` text, `+` right.
- When at cap: replace the add-row with mono 10 `--ink-light` text — `5 / 5 tracked` / `4 / 4 used`.
- Tap an existing item → no-op (delete via the ×). Tap × → confirm if removal would orphan check-in data; otherwise remove inline. Tap add-row → open the existing picker drawer (`TrackedExercisePickerSheet`, or a new metric-rename inline).

#### Pattern D — Single inline form (Profile)

- Avatar block (left, 96×96 on desktop / 72×72 on mobile sub-screen header, `--surface-light-alt` background, 1px `--border-light`, fontsize 28 / 22 mono, initials in `--ink`).
- Beneath avatar (mobile only): `Change photo` outlined button + mono 9 `COMING SOON` label.
- **Name** field: label mono 10 `NAME` above input. Input: 1px `--border-light-strong` when dirty / focused, otherwise 1px `--border-light`. Padding `9 px 12 px`, font 14, `--ink`. Save / Discard footer buttons appear **only when dirty**.

#### Pattern E — Link/connection card (Coaching)

Two stacked cards on the same sub-screen:

1. **Coach connection card** — shows the current state:
    - Linked: 7×7 `--ok` dot · `Linked · {Coach name}` (Inter Tight 14/600) · mono 11 sub `Code 482-911 · linked 04 Mar · check-ins every Sunday` · right-side `Unlink` button (1px `--urgent`40 stroke, `--urgent` text).
    - Pending: 7×7 `--warn` dot · `Pending · {Coach name}` · `Cancel` button.
    - Rejected: 7×7 `--urgent` dot · `Request declined by {Coach name}` · `Dismiss` button.
    - None: input + Link button — code input is numeric, 6 or 8 digits, mono 14 with letter-spacing 0.3em.
2. **Coach mode toggle card** — eyebrow `COACH MODE` · label `Enable coach features` · sub `Adds the Coach tab to the mode pill, plus the client workspace and invite tools.` · toggle right-aligned.

When `coachModeActive`, append a **third** "Coach portal" card below, containing the existing portal tools (invite code, shareable link, email invite, pending requests list, confirmed clients list, branding logo upload). When off, render the dashed-outline placeholder card from `S_SettingsDesktopCoach` showing the four mini stat cells (Invite code / Invite by email / Pending / Confirmed) plus the italic line — *"Logo upload, accept/reject pending requests, and client roster remove all live here too — collapsed while mode is off."* — and a CTA that scrolls focus back to the Coach mode toggle.

#### Pattern F — Action list (Export)

- Each export: 1px `--border-light` row, radius 3, padding `9 px 12 px`, label left, mono 11 `↓ csv` right.
- Tapping the row triggers a download via existing `/api/export/*` routes.

#### Pattern G — Single button (Onboarding, Sign out)

- Description block (mono eyebrow + Archivo Narrow title + Inter Tight 12 description).
- Single button:
    - Onboarding *Replay guide* → outlined `1px solid --ink`, 12/600 text.
    - Sign out → outlined `1px solid --urgent`, `--urgent` text. **Always** triggers a confirm modal first (`Are you sure you want to sign out?` — single primary `Sign out`).

#### Pattern H — Single toggle (Signal UI)

- Description copy + toggle. No segmented or list — it's a single decision.
- Toggling **off** triggers a confirm modal: `Switch back to the legacy UI? You can re-enable Signal at any time.` Confirming triggers `router.refresh()` per the current implementation.

---

## 5 · Desktop — two-pane

```
┌────┬──────────────┬──────────────────────────────────────────────────────┐
│    │ MORE·ACCOUNT │ ACCOUNT · PROFILE                Saved · just now    │
│    │ Settings     │ Identity                                             │
│ S  ├──────────────┤                                                      │
│ I  │ ACCOUNT      │ ┌─[AR]─┬───────────────────────────────────────────┐ │
│ D  │ ▌ Profile    │ │      │ NAME                                       │ │
│ E  │  Signal UI[B]│ │ ●96  │ ┌──────────────────┐                       │ │
│ B  │  Sign out    │ │      │ │ Alex Rosen       │                       │ │
│ A  │ TRAINING     │ │ Photo│ └──────────────────┘                       │ │
│ R  │  Dashboard…  │ │ soon │ Used across training, check-ins…           │ │
│    │  Workout…    │ │      │ [Save name]  Discard                       │ │
│    │  Tracked     │ ├──────┴───────────────────────────────────────────┤ │
│    │  Custom met. │ │ EMAIL  alex@hey.com   JOINED 04 Jan 2025  MODE Train│
│    │  Check-in    │ └──────────────────────────────────────────────────┘ │
│    │  Units       │ ┌─SIGNAL UI──────────┐  ┌─SESSION─────────────────┐ │
│    │  Replay…     │ │ Use Signal UI [●━]│  │ Sign out [outlined urg.]│ │
│    │ COACHING     │ └────────────────────┘  └─────────────────────────┘ │
│    │  Your coach  │                                                      │
│    │  Coach mode  │                                                      │
│    │ DATA         │                                                      │
│    │  Export CSVs │                                                      │
└────┴──────────────┴──────────────────────────────────────────────────────┘
```

### Outer shell

- Reuse the existing **`<SignalSurface surface="planning">`** wrapper.
- Reuse the existing **left sidebar** (`CoachSidebar`-equivalent for Train mode) with `more` active. The desktop sidebar is the existing one — *do not* duplicate the section rail there.
- The "rail" below is a **second column** inside the main content area, NOT part of the app sidebar. This is so More → Account → Settings remains within the standard app shell.

### Settings rail (the second column)

- Width: **232 px**, fixed. Background `--surface-light`, `1px solid --border-light` right edge. Vertical scroll if content overflows.
- Top block padding `0 18px 14px`. Eyebrow `MORE · ACCOUNT` (mono 10, 0.14em, `--ink-light`). Title `Settings` (Archivo Narrow 22/1.0, `-0.01em`).
- Groups: each group has a mono 9 / 0.16em / `--ink-light` title (`ACCOUNT`, `TRAINING`, `COACHING`, `DATA`) plus item rows.
- Item row: padding `8 px 18 px`, font 13 Inter Tight. Active state: `--surface-light-alt` fill, `3px solid --ink` left border, weight 600, `--ink`. Inactive: transparent, weight 500, `--ink-mid`. Badge (`BETA` on Signal UI): mono 8 / `1px 5px` / `--ink` bg / `--signal` text / radius 2.
- Group order: **Account** (Profile, Signal UI, Sign out) → **Training** (Dashboard cards, Workout defaults, Tracked lifts, Custom metrics, Check-in day, Units, Replay onboarding) → **Coaching** (Your coach, Coach mode) → **Data** (Export CSVs).

### Right content pane

- Padding `24 px 36 px 28 px`. Max content width `~720 px`; don't centre — left-align under the pane.
- **Pane header:** justified row. Left: eyebrow (`{GROUP} · {SECTION}` mono 10 / 0.14em / `--ink-light`) + title (Archivo Narrow 30 / 1.0 / `-0.015em` / `--ink`). Right: mono 11 `Saved · just now` (`--ink-light`).
- **Body cards** use the same SectionCard primitive as the mobile sub-screen patterns. The Profile pane stacks a primary identity card + a 3-stat strip (Email / Joined / Mode) inside the same card divider, followed by a 2-column grid for Signal UI + Sign out.
- For the Coaching pane, render the cards from §4 Pattern E directly — they don't need re-rail-ing.

### Behaviour

| Action | Result |
| --- | --- |
| Click rail item | Push `/user/settings/:section`; replace pane content; preserve scroll within the rail |
| Direct URL load | Mark matching rail item active; default to `profile` when no section in URL |
| Scroll within pane | Independent of rail scroll |
| Resize < 960 px | Switch presentation to mobile hub + sub-screens. URL is preserved (a sub-section URL deep-links to that sub-screen) |

---

## 6 · Feature → pattern map (preserve everything)

| Current setting | Section | Pattern | Notes |
| --- | --- | --- | --- |
| Profile · avatar + name | Profile | D | Change photo button stays disabled, mono `COMING SOON` label |
| `showNextWorkout` | Dashboard cards | A | One toggle row |
| `showTodaysMetrics` | Dashboard cards | A | |
| `showWeeklyTraining` | Dashboard cards | A | |
| `showActiveBlock` | Dashboard cards | A | |
| `showUpcomingEvents` | Dashboard cards | A | |
| `showMetricsChart` | Dashboard cards | A | |
| `showE1rmProgress` | Dashboard cards | A | |
| `showStopwatch` | Workout defaults | A | |
| `showWarmupSuggestions` | Workout defaults | A | |
| `showPlateCalculator` | Workout defaults | A | |
| `effortMetric` | Workout defaults | B | None / RPE / RIR segmented |
| `showSupplements` | Workout defaults | A | Adopt this into Workout defaults rather than a separate "Features" section — it is the only Feature toggle |
| `customMetrics` | Custom metrics | C | Cap 4. Existing API: `updateCustomMetrics` |
| `trackedE1rmExercises` | Tracked lifts | C | Cap 5. Existing API: `updateTrackedE1rmExercises`. Tap add-row → existing `TrackedExercisePickerSheet` drawer |
| `checkInDay` | Check-in day | B | 7-cell segmented Mon-Sun (3-char labels) |
| `weightUnit` | Units | B | kg / lbs |
| `bodyweightUnit` | Units | B | kg / lb / st |
| `onboardingDismissed` (reset) | Replay onboarding | G | Button writes `false` via `updateSetting` |
| `signalUiEnabled` | Signal UI | H | Toggling triggers confirm modal + `router.refresh()` on save |
| `/api/export/training-data` | Export CSVs | F | |
| `/api/export/metrics` | Export CSVs | F | |
| `/api/export/check-ins` | Export CSVs | F | |
| Coach link / unlink / pending request | Your coach | E (card 1) | Reuse existing `useCoachInfo` |
| `coachModeActive` | Coach mode | E (card 2) | Reuse existing `handleToggleCoachMode` |
| Coach portal · invite code | Your coach (when mode on) | E (card 3) | Existing portal block |
| Coach portal · shareable link | Your coach (when mode on) | E (card 3) | |
| Coach portal · invite by email | Your coach (when mode on) | E (card 3) | |
| Coach portal · pending requests | Your coach (when mode on) | E (card 3) | |
| Coach portal · confirmed clients | Your coach (when mode on) | E (card 3) | |
| Coach portal · logo upload + crop | Your coach (when mode on) | E (card 3) | Existing `Cropper` dialog stays |
| Sign out | Sign out | G | Confirm modal first |

The current implementation's combined **Features** section disappears; its lone toggle (Supplements) moves into Workout defaults. No other consolidation.

---

## 7 · Toggle, segmented, and button specs (exact)

### Toggle

```css
.toggle             { width: 30px; height: 18px; border-radius: 9px; position: relative; }
.toggle--off        { background: var(--border-light); border: 1px solid var(--border-light); }
.toggle--on         { background: var(--signal);       border: 1px solid var(--signal-deep); }
.toggle__thumb      { position: absolute; top: 1px; width: 14px; height: 14px;
                      border-radius: 50%; background: var(--surface-light); }
.toggle--off .thumb { left: 1px;  border: 1px solid var(--border-light-strong); }
.toggle--on  .thumb { left: 13px; border: 1px solid var(--signal-deep); }
```

No animation tokens specified — match existing motion conventions in `signal/tokens` if any, otherwise a 120 ms ease-out transform is fine.

### Segmented

```css
.segmented          { display: flex; border: 1px solid var(--border-light); border-radius: 3px; overflow: hidden; }
.segmented__cell    { flex: 1; padding: 8px 0; text-align: center;
                      font: 500 12px/1 'Inter Tight'; color: var(--ink-mid); }
.segmented__cell + .segmented__cell { border-left: 1px solid var(--border-light); }
.segmented__cell--active { background: var(--ink); color: var(--surface-light); font-weight: 600; }
.segmented--small .segmented__cell { padding: 6px 0; font-size: 11px; }
```

### Primary / secondary / urgent buttons

| Button | Border | Bg | Text |
| --- | --- | --- | --- |
| Primary (`Save name`) | none | `--ink` | `--surface-light` |
| Outlined ink (`Show guide`) | `1px solid --ink` | none | `--ink` |
| Ghost (`Discard`) | `1px solid --border-light` | none | `--ink-mid` |
| Urgent outlined (`Sign out`, `Unlink`) | `1px solid --urgent` | none | `--urgent` |

All buttons: padding `8 px 14 px`, radius 3, font `600 12px Inter Tight`. Use the **`SignalButton`** primitive at `apps/web/src/components/signal/SignalButton.tsx` (props: `intent: 'primary' | 'outlined' | 'ghost' | 'urgent'`, `size: 'sm' | 'md'`). The Signal MUI theme is **not** modified by Settings — future migrations of other Signal surfaces to `SignalButton` can be tackled separately.

---

## 8 · Loading / error / empty states

- **Loading** (`useSettings()` `loading === true`): replace each control's value with a `SkelLine` of equal height — never collapse the row. Row labels stay rendered. The mobile hub's right-side status text replaces with a 60-px wide skel line.
- **Save error** (existing `error` from `useSettings`): bar at the top of the pane / sub-screen, mono 12, `--urgent` text on `rgba(177,74,53,0.06)` background, dismissable with `×`. Use the existing `Alert` component if Signal-themed; else theme it.
- **Empty list** (Tracked lifts at 0, Custom metrics at 0): show *only* the add-row, no header skel.
- **No coach**: §4 Pattern E card 1 renders the input form instead of the linked card.
- **Coach mode off**: §4 Pattern E card 3 renders the dashed placeholder.

---

## 9 · Accessibility checklist

- [ ] Rail uses `<nav aria-label="Settings sections">`; each rail item is an `<a>` with `aria-current="page"` when active.
- [ ] Sub-screen header `<h1>` is the title (Archivo Narrow 30). Mobile hub `<h1>` is `Everything`.
- [ ] Toggle: `role="switch"`, `aria-checked`, focus outline `2px solid --signal` with 2 px offset.
- [ ] Segmented: `role="radiogroup"`, each cell `role="radio"` with `aria-checked`.
- [ ] Glyph chips are `aria-hidden="true"` (decorative).
- [ ] Touch targets ≥ 44×44 everywhere on mobile; toggle hit-area is the full row, not the 30 px control.
- [ ] Sign out + Unlink + Switch-off-Signal all confirm via the `<Modal>` primitive — never destructive on first tap.
- [ ] Live region announces `Saved` on successful auto-save (debounce 600 ms so we don't fire on every keystroke).

---

## 10 · Out of scope (do not build)

- Self-managed check-ins (Forti rule: client-only weekly review for now).
- Nutrition targets — has its own top-level nav, not a Settings sub-screen.
- Bodyweight target — lives under client Targets workspace.
- AI assistant configuration — Forti rule: AI is utility only, no persistent assistant.
- Push-notification preferences — separate primitive, not part of this PR.
- Theme picker (light / dark / auto) — Signal is one theme; the only "theme switch" is the Signal UI opt-in toggle, which already exists.

---

## 11 · Acceptance checklist

Verify against the canvas (`stage5/signal-settings.jsx`, section "Settings"):

- [ ] Mobile hub renders four groups (Account, Training, Coached, Advanced) with correct rows in order.
- [ ] Each hub row is 48 px tall, has the glyph chip + label + mono sub + chevron, divided by 1 px `--border-light` only.
- [ ] Tapping any hub row pushes the matching URL and renders the sub-screen.
- [ ] Sub-screen header has eyebrow (signalDeep) + Archivo Narrow 30 title + 12 px description + justified status strip — in that order.
- [ ] All 12 sub-screens are implemented and map to the patterns in §6.
- [ ] Settings rail (desktop) is exactly 232 px wide with the four group titles in order; active row has the 3 px ink left rule + altsurface fill + 600 weight.
- [ ] Resizing between desktop and mobile swaps presentations without re-fetching settings.
- [ ] Every feature in §6 is reachable and editable.
- [ ] No setting silently moves — Supplements consolidates into Workout defaults only.
- [ ] Save behaviour: changes persist via the existing `useSettings()` / `updateSetting()` APIs; no Save button anywhere except the dirty-Name flow on Profile.
- [ ] Sign out and Unlink confirm via `<Modal>` before destructive action.
- [ ] Coach portal collapses to dashed placeholder when Coach mode is off, expands inline when on — no full page reload.
- [ ] The current `signalEnabled` branch of `SettingsClient.tsx` is replaced wholesale; the legacy `signalEnabled === false` branch is untouched.
