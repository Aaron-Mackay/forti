# Workflows — Forti Agent Execution Guide

Extended process guidance for verification depth, UI planning, and delivery quality.
Use this document when task scope affects process decisions or UI execution.

## Testing & Verification

### Required quality checks
- `npm run check` is the default quality gate (test + lint + build).
- Run targeted tests for changed behavior in addition to global checks when feasible.

### E2E discipline
- UI behavior changes should include updated/added Playwright coverage.
- Use fixtures import pattern:

```ts
import { test, expect } from './fixtures';
```

- Avoid brittle broad locators; Playwright strict mode fails when selectors match multiple nodes.
- State-mutating E2E suites should run serial and chromium-only to avoid shared TestUser DB conflicts.

### Seed-data caveat
- Do not rely on Jeff/Todd user-specific seeded data in E2E tests.
- Create and clean user-specific data inside test setup/teardown when needed.

## Git & Commit Discipline

- Keep commits atomic (single logical concern).
- Husky pre-commit runs `npm run check`; do not bypass.
- If E2E-covered UI behavior changed, run affected Playwright tests before committing.

## UI Planning Rule

Before implementing any UI beyond a small, self-contained component, provide:

1. **Layout Spec** (sections, data, interactions, sticky/scroll behaviors).
2. **ASCII Wireframe** (~390px mobile portrait).

Wait for explicit approval before coding that UI.

## Manual Testing Block (for UI changes)

When visual behavior changes cannot be fully validated in automation, provide this block:

```md
## Manual Test Required

Steps:
1. Start the dev server: `npm run dev`
2. Open [URL / page] in browser
3. [Specific interaction]
4. Expected result: [observable outcome]
```

For UI-touching PRs, include the same section in the PR body when relevant.

## Working Style

- Ask 1–2 focused clarifying questions for materially ambiguous scope.
- Prefer proceeding with explicit assumptions when ambiguity is low.
- Keep communication concise and specific.

## Post-Implementation Debrief (Required)

Include concise decision bullets after implementation:

- Decision: <what>
  Rationale: <why>

Guidelines: 3–6 bullets, focus on non-obvious tradeoffs, avoid trivial details.
