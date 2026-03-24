# Manual Test Checklist — March 13–24 2026

Covers all UI-touching changes from PRs #68–111. Steps are ordered to minimise account-switching and page-navigation overhead. Complete all **As Jeff** sections before switching to the coach flow.

---

## Pre-flight

- [ ] Run `npm run db:reset` to get a clean, fully-seeded database
- [ ] Run `npm run dev` and wait for "Ready" in the terminal
- [ ] Open `http://localhost:3000` in a mobile-width browser window (390 px) or Chrome DevTools device emulation

**Seeded accounts available:**
| Account | Email | Role |
|---|---|---|
| Jeff Demo | jeff@example.com | Regular user (client of Todd) |
| Todd | todd@example.com | Coach (Jeff's coach) |
| TestUser | testuser@example.com | E2E test account |

---

## 1. New User Registration Wizard (PR #109)

> **Account:** Any brand-new account (or temporarily clear Jeff's `settings` column in the DB to simulate). The wizard fires when `settings` is null on first login.

- [ ] Log in with a new Google account (or use demo and manually set `settings = null` in the DB via `npm run local-db`)
- [ ] After login, confirm you are redirected to `/user/onboarding` (not the dashboard)
  - *Expected: onboarding wizard loads with step 1 of 3 active*
- [ ] **Step 1 — Profile:** Enter a display name; confirm avatar shows your initials
  - [ ] Leave name empty and click Next — *Expected: validation error*
  - [ ] Enter a valid name and click Next
- [ ] **Step 2 — Stats:** Toggle between kg and lbs; enter a starting weight; pick a check-in day
  - [ ] Click Next
- [ ] **Step 3 — Coach setup:** Leave coach code blank and click Finish
  - [ ] *Expected: wizard completes, redirects to `/user` dashboard*
- [ ] Repeat the wizard on another fresh account, this time entering an **invalid** coach code on step 3
  - [ ] *Expected: inline error shown, stays on step 3*
- [ ] Back on the dashboard, confirm the Getting Started card is visible (PR #96)

---

## 2. Welcome Modal & Getting Started Card (PR #96, #100)

> **Account:** Jeff Demo

- [ ] Log in as Jeff Demo via the "Try Demo" button
- [ ] *Expected: welcome modal appears on first load*
- [ ] Dismiss the modal — *Expected: it closes immediately and does NOT reopen on the same session (PR #100 race condition fix)*
- [ ] Reload the page — *Expected: modal does not reopen*
- [ ] On the dashboard, locate the **Getting Started** card
  - [ ] Confirm it lists 4 steps: Create a plan, Log metrics, Complete a check-in, Do a workout
  - [ ] Steps that Jeff has already completed (plans exist, metrics seeded) should show as ticked
- [ ] Navigate to `/user/settings` → scroll to the **Onboarding** section → click "Show Getting Started guide"
  - [ ] Return to dashboard — *Expected: Getting Started card is visible again*

---

## 3. Settings — Configure Everything Up Front (PRs #94, #106, #107, #110)

> **Account:** Jeff Demo — set everything up now so later sections work as expected.

### Units (PR #101 — kg/lbs)
- [ ] Navigate to `/user/settings` → **Units** section
- [ ] Toggle to **lbs** — *Expected: toggle group highlights lbs*
- [ ] Navigate to a workout (any workout in Jeff's plan) — confirm weight fields show `lbs`
- [ ] Return to Settings → toggle back to **kg**

### Effort Metric (PR #110 — RPE/RIR)
- [ ] In Settings → **Workout** section → find the **Effort metric per set** toggle group
- [ ] Select **RPE** — *Expected: RPE highlighted*
- [ ] Confirm setting persists on page reload
- [ ] (Leave on RPE for the workout section tests below; switch to RIR afterward to verify both)

### Supplements (PR #88)
- [ ] In Settings → **Features** section → enable the **Supplements** toggle
- [ ] *Expected: Supplements link appears in the sidebar nav*

### E1RM Progress Tracking (PR #107)
- [ ] In Settings → **E1RM Progress Tracking** section
- [ ] Search for "Bench Press" and select it
- [ ] Search for "Squat" and select it
- [ ] Confirm counter shows "2/5 selected"
- [ ] Also confirm the **E1RM Progress** dashboard card toggle is ON under Dashboard Cards

### Custom Metrics (PR #94)
- [ ] In Settings → **Custom Metrics** section
- [ ] Click "Add metric" and name it "Waist"
- [ ] Click "Add metric" again and name it "Thigh"
- [ ] Confirm both slots are saved on reload

### Export Data (PR #106) — test here, download files
- [ ] Scroll to the bottom of Settings → **Export Data** section
- [ ] Click **Download Training Plans** — *Expected: CSV file downloads*
- [ ] Click **Download Daily Metrics** — *Expected: CSV file downloads with Jeff's 60 days of data*
- [ ] Click **Download Check-in History** — *Expected: CSV file downloads with Jeff's 6 check-ins*
- [ ] Open each CSV — confirm it has headers, is UTF-8 (no garbled characters in Excel)

---

## 4. Exercise Library (PRs #81, #108)

> **Account:** Jeff Demo

### Browse & create (PR #81)
- [ ] Navigate to `/exercises` via the sidebar
- [ ] Confirm the exercise grid loads (global exercises visible)
- [ ] Search for "Bench Press" — *Expected: card appears with muscle chips and anatomy diagram*
- [ ] Tap/click a card to open the **Exercise Detail Drawer**
  - [ ] Confirm default description is visible
  - [ ] Confirm E1RM history chart is present (Jeff has logged sets)
- [ ] Close the drawer

### User-private exercise creation
- [ ] Navigate to `/user/plan/create` → Start from scratch → add an exercise
- [ ] Type a unique name that doesn't exist (e.g. "Mega Lunge 9000") in the exercise search field
- [ ] *Expected: a `+ Create "Mega Lunge 9000"` option appears in the dropdown*
- [ ] Select it — *Expected: AddExerciseForm dialog opens pre-filled with the name*
- [ ] Save the exercise
- [ ] *Expected: exercise is added to the plan row and appears in subsequent searches for Jeff*
- [ ] Log out and log in as Todd — search for "Mega Lunge 9000"
  - [ ] *Expected: exercise is NOT visible to Todd (user-private scoping)*

### Coach exercise descriptions (PR #108) — defer to Coach Flow section

---

## 5. Plan Creation & Editing (PRs #81, #97, #102, #92)

> **Account:** Jeff Demo

### AI text import
- [ ] Navigate to `/user/plan/create` → select **Build with AI**
- [ ] Fill in days/week (4), goal (Muscle), level (Intermediate), add optional notes
- [ ] Submit — *Expected: loading spinner/modal appears while Claude generates*
- [ ] *Expected: plan editor opens with a populated plan structure*

### AI spreadsheet import (PR #102)
- [ ] Navigate to `/user/plan/create` → select **Import from spreadsheet**
- [ ] Upload a CSV file containing a simple training table (or paste one)
  - Sample paste: `Day,Exercise,Sets,Reps\nMonday,Squat,4,5\nMonday,Bench,3,8\nWednesday,Deadlift,3,5`
- [ ] *Expected: 3-step progress dialog appears (Uploading → Analysing with AI → Building plan)*
  - [ ] Each step shows a spinner while active, checkmark when done
- [ ] *Expected: on success, redirected to plan editor with AI-structured plan*
- [ ] Test an oversized paste (>150 KB) — *Expected: error message about file size limit*

### Manual plan with inline exercise creation (PR #81, then PR #102's dropdown change)
- [ ] Start from scratch, add a week, add a workout
- [ ] In the exercise search field, type a new unique name
- [ ] *Expected: `+ Create "..."` option appears at the bottom of the dropdown (not as a separate button)*
- [ ] Select it, fill in the form, save — *Expected: exercise populates the row inline*

### Save snackbar (PR #92)
- [ ] Make a change to any plan and click Save
- [ ] *Expected: MUI Snackbar toast appears ("Saved" or similar) and auto-dismisses — no native browser alert()*

### Mobile drag-reorder (PR #97) — requires touch emulation or real device
- [ ] Open a plan with multiple weeks in plan edit mode on mobile (or Chrome DevTools touch emulation)
- [ ] **Long-press** (hold ~250 ms) on a week chip
- [ ] *Expected: chip lifts / drag handle becomes active; drag to reorder weeks*
- [ ] Long-press on a workout row within the active week
- [ ] *Expected: drag handle appears; drag to reorder workouts vertically*
- [ ] Save — confirm new order persists on reload


---

## 6. Workout Execution (PRs #67, #68, #69, #110, #111)

> **Account:** Jeff Demo — navigate to an existing workout in his plan

- [ ] From the dashboard or Plans page, open a workout session

### Warmup suggestions (PR #67)
- [ ] On an exercise slide, enter a weight for Set 1 (e.g. 100 kg)
- [ ] Tap **"Suggest warmup sets"**
- [ ] *Expected: table expands showing 4 warmup sets: 50 kg×10, 60 kg×5, 75 kg×3, 85 kg×1 (rounded to nearest 2.5)*
- [ ] Tap again to collapse

### Unit display (PR #101)
- [ ] In Settings switch to **lbs**, return to workout
- [ ] *Expected: weight fields and "Prev" captions show lbs values*
- [ ] Switch back to **kg**

### Per-exercise unit override (PR #101)
- [ ] **Long-press** the weight input field on any exercise
- [ ] *Expected: context menu appears with options: Default / Force kg / Force lbs / No unit*
- [ ] Select **No unit** (for a pin-loaded machine exercise)
  - [ ] *Expected: weight label loses unit suffix; warmup suggestions and plate calculator are hidden*
- [ ] Select **Force lbs** on the same exercise while global setting is kg
  - [ ] *Expected: that exercise shows lbs while others still show kg*
- [ ] Reset to **Default**

### Plate calculator & layout (PRs #101, #111)
- [ ] On a barbell exercise, locate the set row
- [ ] *Expected: plate calculator icon appears **next to the set-number badge** (not between weight and reps fields)*
- [ ] Tap the plate calculator icon
- [ ] *Expected: plate calculator sheet opens, showing loaded plates for the entered weight*

### Drop sets (PR #69)
- [ ] On any exercise set row, tap **"+ Add Drop Set"**
- [ ] *Expected: a new indented row appears below (labelled "↓ Drop 1") with weight pre-filled at ~80% of parent set*
- [ ] Enter reps and confirm the row saves
- [ ] Add a second drop set — *Expected: "↓ Drop 2" appears*
- [ ] Delete a drop set using the remove button — *Expected: row disappears, remaining sets re-label correctly*
- [ ] *Expected: drop set rows have slightly more top margin so they don't overlap the Est. 1RM trophy icon (PR #111)*

### RPE chips (PR #110 — requires RPE enabled in Settings)
- [ ] Confirm that below each regular set row, a horizontal row of RPE chips (6, 6.5, 7, … 10) is visible
- [ ] Tap **RPE 8** — *Expected: chip highlights; value persists after navigating away and back*
- [ ] Tap **RPE 8** again — *Expected: chip deselects (toggles off)*
- [ ] In Settings → change effort metric to **RIR**; return to workout
  - [ ] *Expected: chips show RIR values (0, 1, 2, 3, 4) instead of RPE*
- [ ] In Settings → change effort metric to **None**; return to workout
  - [ ] *Expected: no effort chips visible under sets*

### Week muscle coverage diagram (PR #68)
- [ ] From the workout/plan view, navigate to the **week selection** screen (the list of workouts for a week)
- [ ] *Expected: a body diagram panel appears above the workout list, shaded blue by muscle group based on completed sets*
- [ ] *Expected: a per-muscle done/planned set breakdown is listed*


---

## 7. Dashboard — E1RM Card (PR #107)

> **Account:** Jeff Demo — do this after logging at least one workout set

- [ ] Return to the dashboard (`/user`)
- [ ] *Expected: **E1RM Progress** card is visible (if enabled in Settings)*
- [ ] *Expected: Bench Press and Squat rows each show "Recent: X kg" and "Best: Y kg" with a sparkline chart*
- [ ] Hover/tap a sparkline point — *Expected: tooltip shows the date*
- [ ] Navigate to Settings → remove one exercise from E1RM tracking — return to dashboard
  - [ ] *Expected: that exercise's row disappears from the card*
- [ ] In Settings → disable the **E1RM Progress** Dashboard Card toggle
  - [ ] *Expected: card is hidden from the dashboard entirely*
- [ ] Re-enable it

---

## 8. Calendar (PRs #90, #99)

> **Account:** Jeff Demo

### Week list view (PR #90)
- [ ] Navigate to `/user/calendar`
- [ ] *Expected: toggle bar with "Calendar" and "Weeks" options is visible below the AppBar*
- [ ] Tap **Weeks**
- [ ] *Expected: single-column week list grouped by month (sticky month headers)*
- [ ] *Expected: current week is highlighted and scrolled into view on load*
- [ ] *Expected: Jeff's seeded block events appear with a coloured left border; custom events appear as bullet items*
- [ ] Tap any past week — *Expected: switches to Calendar view and scrolls to that week*
- [ ] Switch back to Weeks — *Expected: scroll position is preserved*

### Recurring events (PR #99)
- [ ] Tap a future day on the calendar to open the event creation form
- [ ] Fill in a title (e.g. "Leg Day")
- [ ] Find the **Repeat** dropdown — select **Weekly**
- [ ] *Expected: an "Ends On" date picker appears*
- [ ] Set an end date 6 weeks out
- [ ] Save the event
- [ ] *Expected: the event repeats on the same weekday for 6 weeks on the calendar*
- [ ] Open one of the recurring occurrences → edit it
  - [ ] *Expected: recurrence chip visible in event details*
- [ ] Delete the event — *Expected: confirmation mentions "all occurrences"*

### iCal export (PR #99)
- [ ] Open the calendar right-hand drawer (Events/Blocks sidebar)
- [ ] *Expected: **Export calendar** button is visible at the bottom*
- [ ] Tap it — *Expected: `forti-calendar.ics` file downloads*
- [ ] Open an individual event → *Expected: export icon button visible*
- [ ] Tap it — *Expected: `forti-<title>.ics` file downloads*

---

## 9. Nutrition (PR #86)

> **Account:** Jeff Demo

- [ ] Navigate to `/user/nutrition` via the sidebar
- [ ] *Expected: weekly macro summary with progress bars, 7-day log table*
- [ ] Tap a day row to expand it and enter calorie/protein/carb/fat actuals inline
  - [ ] *Expected: values save on blur; progress bars update*
- [ ] Tap **Set Week Targets** (or equivalent button)
  - [ ] *Expected: dialog opens with calorie/macro/steps/sleep target fields*
  - [ ] Enter targets and save — *Expected: progress bars reflect targets*
- [ ] Use week navigation arrows to browse previous weeks
  - [ ] *Expected: historical data loads*

---

## 10. Supplements (PR #88)

> **Account:** Jeff Demo — Supplements must be enabled in Settings first (done in Section 3)

- [ ] Navigate to `/user/supplements` via the sidebar
- [ ] *Expected: two sections: Active and History (empty for Jeff)*
- [ ] Click **Add supplement**
- [ ] Fill in: Name "Creatine", Dosage "5g", Frequency "Daily", no end date
- [ ] Save — *Expected: "Creatine" appears in the **Active** section*
- [ ] Add a second supplement with an **end date in the past**
  - [ ] *Expected: it appears in the **History** section, not Active*
- [ ] Edit the Active supplement — change the dosage; save
  - [ ] *Expected: updated dosage shown*
- [ ] Delete one supplement — *Expected: removed from list*

---

## 11. Custom Day Metrics (PR #94)

> **Account:** Jeff Demo — "Waist" and "Thigh" custom metrics added in Section 3

- [ ] Navigate to `/user/calendar`
- [ ] Tap today's date to open the day drawer
- [ ] *Expected: "Waist" and "Thigh" appear as input slots alongside the built-in metrics (weight, steps, sleep, etc.)*
- [ ] Enter a value for "Waist" (e.g. 80)
  - [ ] *Expected: field also shows an optional target sub-field*
- [ ] Save — *Expected: value persists on reload*
- [ ] Navigate to Settings → Custom Metrics → delete the "Thigh" metric
  - [ ] Return to the day drawer — *Expected: Thigh slot is gone; Waist slot remains*


---

## 12. Weekly Check-In (PR #78)

> **Account:** Jeff Demo

- [ ] Navigate to `/user/check-in` via the sidebar
- [ ] *Expected: this week's check-in form is shown (ratings sliders, training counts, free-text review field)*
- [ ] Fill in all 6 subjective ratings (energy, mood, stress, sleep, recovery, adherence)
- [ ] Enter training counts and a short week review
- [ ] Submit — *Expected: page flips to "Check-in complete" confirmation state*
- [ ] Reload the page — *Expected: completed state persists; form is read-only*
- [ ] Expand the history accordion below — *Expected: the just-submitted entry is visible*
- [ ] Also confirm Jeff's 3 coach-reviewed check-ins (seeded) show Todd's notes in the history

### Check-in day setting
- [ ] Navigate to Settings → **Check-in** section
- [ ] Change the check-in day (e.g. from Monday to Friday)
- [ ] Reload Settings — *Expected: Friday is selected*

### Push notifications (if environment supports it)
- [ ] On the check-in page, if a "Enable notifications" prompt appears, allow it
- [ ] *Expected: browser permission dialog fires; once granted, no further prompts*

---

## 13. Notification Centre (PR #95)

> **Account:** Jeff Demo (notifications are created when check-ins are submitted, coach notes are added, etc.)

- [ ] Look at the **hamburger menu icon** in the AppBar
- [ ] *Expected: a badge showing the unread count is visible (if Jeff has unread notifications)*
- [ ] Tap the hamburger → look at the **bell icon** in the drawer header
  - [ ] *Expected: badge with unread count is shown*
  - [ ] Tap the bell → navigates to `/user/notifications`
- [ ] On the notifications page:
  - [ ] *Expected: list of notifications with per-type icons, timestamps shown as relative time ("2 hours ago")*
  - [ ] Unread notifications have a distinct tint/highlight
- [ ] Tap a notification — *Expected: marks it read; highlight disappears*
- [ ] Tap **Mark all read** — *Expected: all items lose their unread tint; badge clears*

---

## 14. Library (PR #104)

> **Account:** Jeff Demo

- [ ] Navigate to `/user/library` via the sidebar (BookmarksIcon)
- [ ] *Expected: page loads with "My Library" section (empty for Jeff initially)*
- [ ] *(If Jeff has a coach, a "From Todd" section would also appear — covered in Coach Flow)*

### Add a single link
- [ ] Tap **Add to Library**
- [ ] Select type **Link**, enter title "Cool Article", URL `https://example.com`
- [ ] Save — *Expected: card appears in "My Library"*
- [ ] Tap the card's external link icon — *Expected: opens the URL*
- [ ] Delete the card — *Expected: removed from list*

### Bulk import via paste (PR #104)
- [ ] Tap **Bulk Upload Links**
- [ ] Switch to **Paste text** mode
- [ ] Paste the following CSV:
  ```
  name,url
  Forti Docs,https://example.com/docs
  Training Guide,https://example.com/guide
  Bad Row,not-a-url
  ```
- [ ] *Expected: preview list shows 2 rows with ✓ and 1 row with ✗ (invalid URL)*
- [ ] Click Import — *Expected: 2 valid links added; 1 invalid row skipped*

### Bulk import via file upload
- [ ] Save the above CSV to a `.csv` file and upload it via the file picker
- [ ] *Expected: same preview behaviour as paste mode*

### Document/Image/Video placeholders
- [ ] Tap **Add to Library** and select type **Document**
- [ ] *Expected: form shows a "Coming soon" placeholder — no upload field*

---

## 15. Feedback Form (PR #103, #105)

> **Account:** Jeff Demo

- [ ] Open the sidebar drawer → click the **Feedback** nav link
- [ ] *Expected: navigates to `/user/feedback` (not `/feedback`) — no crash*
- [ ] *Expected: page shows a form with a **Type** dropdown, description textarea, and optional screenshot upload*
- [ ] Change the **Type** dropdown to each option in turn: Bug Report, Feature Request, Improvement Suggestion
  - [ ] *Expected: the label updates; no errors*
- [ ] Fill in the description field
- [ ] Click Submit — *Expected: success message appears ("Feedback submitted"); form clears*
  - *(Note: email delivery requires MAILERSEND_API_KEY — just confirm no crash if key is absent)*


---

## 16. Coach Flow (PRs #76, #78, #85, #108)

> Switch accounts as indicated. Jeff is Todd's client (seeded). The registration link flow requires a fresh/uninvited account.

### Coach registration link (PR #76)

**As Todd:**
- [ ] Log out, log in as Todd (`todd@example.com` via the "Try Demo" button is not available — use direct login or DB credentials)
- [ ] Navigate to `/user/settings` → **Coaching Settings** section
- [ ] Confirm Todd's 6-digit invite code is shown
- [ ] Click **"Or share this link"** → copy the shareable URL (format: `http://localhost:3000/coach/[code]`)

**As a fresh account (not yet linked to any coach):**
- [ ] Open the copied `/coach/[code]` URL while logged out
  - [ ] *Expected: redirected to login with a `callbackUrl` pointing back to the coach page*
- [ ] Log in — *Expected: redirected to the `/coach/[code]` page*
- [ ] *Expected: page shows coach's name and a "Link with this coach" confirmation button*
- [ ] Confirm — *Expected: CoachRequest is created; success state shown*

**As Todd:**
- [ ] Navigate to `/user/settings` → Coaching section → check for pending requests
- [ ] Accept the request — *Expected: new client appears in Todd's client list*

### Coach creates a plan for a client (PR #85)

**As Todd:**
- [ ] Navigate to `/user/plan`
- [ ] *Expected: a "Client Plans" section appears, grouped by client name (including Jeff)*
- [ ] Click **Add Plan** next to Jeff's name
  - [ ] *Expected: plan creation flow opens, targeting Jeff's account*
- [ ] Create a simple plan and save
- [ ] *Expected: plan appears under Jeff in Todd's Client Plans section*

**As Jeff:**
- [ ] Navigate to `/user/plan`
- [ ] *Expected: the plan Todd just created is visible in Jeff's plans list*

### Coach exercise descriptions (PR #108)

**As Todd:**
- [ ] Navigate to `/exercises`
- [ ] Open the **Exercise Detail Drawer** for "Bench Press"
- [ ] *Expected: an editable **"Description for clients"** textarea is visible in the drawer*
- [ ] Type "Keep your shoulder blades retracted throughout the movement" and click **Save**
  - [ ] *Expected: the exercise card shows a blue "Coach" chip*

**As Jeff (log in as Jeff):**
- [ ] Navigate to `/exercises` → find "Bench Press"
- [ ] *Expected: the "Coach" chip is visible on the card, and the description is replaced by Todd's text*
- [ ] Open the Exercise Detail Drawer
  - [ ] *Expected: a highlighted "From your coach" block shows Todd's description*
  - [ ] *Expected: no editable field (Jeff cannot edit coach descriptions)*

**As Todd:**
- [ ] Re-open Bench Press drawer → click **Clear** to remove the description
  - [ ] *Expected: "Coach" chip and "From your coach" block are gone for Jeff*

### Coach reviews check-ins (PR #78)

**As Todd:**
- [ ] Navigate to `/user/coach/check-ins` via the sidebar ("Client Check-ins")
- [ ] *Expected: **New** tab shows Jeff's latest unreviewed check-in*
- [ ] Open the check-in card — read Jeff's ratings and review text
- [ ] Enter coach notes in the feedback field and click **Save Notes**
  - [ ] *Expected: notes persist; entry moves to the Browse tab*
- [ ] Switch to **Browse** tab — confirm reviewed check-ins are listed with search/filter

**As Jeff:**
- [ ] Navigate to `/user/check-in` → scroll to the history accordion
- [ ] *Expected: Todd's notes are visible on the check-in Jeff submitted in Section 12*

### Coach notification (PR #95)

**As Jeff:** Submit a new check-in (if this week's was already submitted, temporarily use a different week or reset)

**As Todd:**
- [ ] Check the AppBar badge and `/user/notifications`
- [ ] *Expected: a "New check-in submitted by Jeff" notification is listed*

---

## 17. Offline Storage & Sync (PR #70)

> **Account:** Jeff Demo — requires Chrome DevTools Network throttling

- [ ] Open a workout session and note the current set data
- [ ] In Chrome DevTools → Network tab → set to **Offline**
- [ ] *Expected: offline banner appears ("You're offline")*
- [ ] Enter a weight and reps for a set — *Expected: values appear immediately (optimistic update)*
- [ ] Navigate away and back to the workout — *Expected: entered values are still there (restored from IndexedDB)*
- [ ] Set Network back to **Online**
- [ ] *Expected: banner dismisses; offline changes sync to the server*
- [ ] Reload the page — *Expected: synced values persist from the server*

---

## Coverage Reference

| PR | Section(s) |
|----|-----------|
| #68 | 6 — Week muscle coverage |
| #69 | 6 — Drop sets |
| #70 | 17 — Offline storage |
| #76 | 16 — Coach registration link |
| #78 | 12, 16 — Check-in + coach notes |
| #81 | 4, 5 — Inline exercise creation |
| #85 | 16 — Coach plan management |
| #86 | 9 — Nutrition |
| #88 | 10 — Supplements |
| #90 | 8 — Calendar week list |
| #92 | 5 — Save snackbar |
| #94 | 11 — Custom day metrics |
| #95 | 13, 16 — Notification centre |
| #96 | 2 — Getting Started card / welcome modal |
| #97 | 5 — Mobile drag-reorder |
| #99 | 8 — Recurring events + iCal |
| #100 | 2 — Welcome modal race fix |
| #102 | 5 — AI spreadsheet import |
| #103 | 15 — Feedback form rename |
| #104 | 14 — Library page |
| #105 | 15 — Feedback page route fix |
| #106 | 3 — CSV exports |
| #107 | 3, 7 — E1RM dashboard card |
| #108 | 16 — Coach exercise descriptions |
| #109 | 1 — Registration wizard |
| #110 | 3, 6 — RPE/RIR tracking |
| #111 | 6 — Set row layout / plate calc position |
