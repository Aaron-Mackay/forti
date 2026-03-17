---
name: playwright-cli
description: Automates browser interactions for testing and verifying the Forti fitness app at localhost:3000. Use when asked to visually test, screenshot, or explore any page in the Forti UI.
allowed-tools: Bash(playwright-cli:*)
---

# Browser Automation with playwright-cli (Forti)

Base URL: `http://localhost:3000` — the dev server must be running (`npm run dev`).

## Auth — ALWAYS load session first

Forti uses NextAuth JWT sessions. The saved demo user state lives at `playwright/.auth/user.json`. Load it before navigating to any protected page:

```bash
playwright-cli open http://localhost:3000
playwright-cli state-load playwright/.auth/user.json
```

If the session is stale (redirected to `/login`), re-authenticate and save:

```bash
playwright-cli open http://localhost:3000/login
playwright-cli snapshot
playwright-cli click <Try-Demo-button-ref>
# wait for redirect to /user, then:
playwright-cli state-save playwright/.auth/user.json
```

## Key Routes

| URL | Page |
|-----|------|
| `http://localhost:3000/user` | Dashboard |
| `http://localhost:3000/user/calendar` | Calendar & day metrics |
| `http://localhost:3000/user/plan` | Training plan editor |
| `http://localhost:3000/user/settings` | User settings (dashboard card visibility toggles) |
| `http://localhost:3000/coach/<code>` | Coach registration/invitation page (6-digit code) |
| `http://localhost:3000/user/workout/<id>` | Active workout |
| `http://localhost:3000/exercises` | Exercise library |
| `http://localhost:3000/login` | Login (public) |

## Core Commands

```bash
playwright-cli open http://localhost:3000
playwright-cli goto http://localhost:3000/user/plan
playwright-cli snapshot                          # always snapshot before interacting
playwright-cli snapshot --filename=plan.yaml     # save named snapshot
playwright-cli click e3
playwright-cli fill e5 "text"
playwright-cli select e9 "option-value"
playwright-cli check e12
playwright-cli uncheck e12
playwright-cli hover e4
playwright-cli eval "document.title"
playwright-cli eval "el => el.textContent" e5
playwright-cli dialog-accept
playwright-cli dialog-dismiss
playwright-cli resize 390 844                    # mobile viewport (iPhone)
playwright-cli resize 1440 900                   # desktop viewport
playwright-cli close
```

## Navigation

```bash
playwright-cli go-back
playwright-cli go-forward
playwright-cli reload
```

## Keyboard

```bash
playwright-cli press Enter
playwright-cli press ArrowDown
playwright-cli press Tab
playwright-cli press Escape
```

## Screenshots

```bash
playwright-cli screenshot                        # full page
playwright-cli screenshot --filename=result.png  # named file
playwright-cli screenshot e5                     # element only
```

## Auth & Storage

```bash
# Load/save NextAuth session
playwright-cli state-load playwright/.auth/user.json
playwright-cli state-save playwright/.auth/user.json

# Inspect session cookies
playwright-cli cookie-list
playwright-cli cookie-get next-auth.session-token
```

## DevTools (Debugging)

```bash
playwright-cli console              # all console messages
playwright-cli console error        # errors only
playwright-cli network              # all network requests (check for 4xx/5xx)
playwright-cli tracing-start
playwright-cli tracing-stop         # saves trace for Playwright Trace Viewer
```

## Snapshots

Every command prints a snapshot reference. Use refs (e1, e2 …) for interactions:

```
> playwright-cli goto http://localhost:3000/user/plan
### Page
- Page URL: http://localhost:3000/user/plan
- Page Title: Forti – Plan
### Snapshot
[Snapshot](.playwright-cli/page-2026-03-03T10-00-00-000Z.yml)
```

## Forti Workflow Examples

### Verify the dashboard loads

```bash
playwright-cli open http://localhost:3000
playwright-cli state-load playwright/.auth/user.json
playwright-cli goto http://localhost:3000/user
playwright-cli console error
playwright-cli snapshot
playwright-cli screenshot --filename=dashboard.png
playwright-cli close
```

### Test the plan editor

```bash
playwright-cli open http://localhost:3000
playwright-cli state-load playwright/.auth/user.json
playwright-cli goto http://localhost:3000/user/plan
playwright-cli snapshot
# click a workout to open it
playwright-cli click <workout-ref>
playwright-cli snapshot
playwright-cli console error
playwright-cli close
```

### Test the calendar & day metrics

```bash
playwright-cli open http://localhost:3000
playwright-cli state-load playwright/.auth/user.json
playwright-cli goto http://localhost:3000/user/calendar
playwright-cli snapshot
playwright-cli screenshot --filename=calendar.png
playwright-cli close
```

### Verify mobile layout

```bash
playwright-cli open --browser=webkit http://localhost:3000
playwright-cli resize 390 844
playwright-cli state-load playwright/.auth/user.json
playwright-cli goto http://localhost:3000/user
playwright-cli screenshot --filename=mobile-dashboard.png
playwright-cli close
```

### Debug an API call

```bash
playwright-cli open http://localhost:3000
playwright-cli state-load playwright/.auth/user.json
playwright-cli goto http://localhost:3000/user/plan
playwright-cli network          # see all requests, check for errors
playwright-cli console error    # check for JS errors
playwright-cli close
```

### Generate Playwright test code

Every action outputs the corresponding Playwright TypeScript code. Collect it into a test file:

```typescript
import { test, expect } from './fixtures';  // always use fixtures, not @playwright/test

test('plan editor loads', async ({ page }) => {
  await page.goto('/user/plan');
  await expect(page).toHaveURL('/user/plan');
  // add assertions here
});
```

## Running the Full E2E Suite

```bash
npm run test:e2e                                          # all tests
npx playwright test tests/e2e/dashboard.test.ts           # one file
npx playwright test tests/e2e/plans.test.ts
npx playwright test tests/e2e/calendar.test.ts
npx playwright test tests/e2e/WorkoutClient.test.ts
npx playwright test tests/e2e/AppBar.test.ts
npx playwright test tests/e2e/exercises.test.ts
```

## Specific tasks

* **Request mocking** [references/request-mocking.md](references/request-mocking.md)
* **Running Playwright code** [references/running-code.md](references/running-code.md)
* **Storage state** [references/storage-state.md](references/storage-state.md)
* **Test generation** [references/test-generation.md](references/test-generation.md)
* **Tracing** [references/tracing.md](references/tracing.md)
