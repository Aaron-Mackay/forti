# Signal System Direction — Agent UI Shortcut

This document is the fast visual-direction guide for agents making Forti UI changes.

It distils the Stage 5 Signal screenshots into implementation guidance, but it is not higher authority than the existing design docs. If anything here conflicts with `stage-1-decision-register.md`, `signal-agent-guardrails.md`, `signal-audit.md`, or route-specific QA docs, follow the existing `.md` files first.

Use this document to preserve the Signal feel while making small, safe UI changes.

---

## Read order for UI work

Before changing Signal UI, read:

1. `docs/design/README.md`
2. `docs/design/stage-1-decision-register.md`
3. `docs/design/signal-agent-guardrails.md`
4. This file
5. `docs/design/signal-audit.md`
6. `docs/design/signal-ui-qa-checklist.md` for the affected route/state

Current code is evidence, not automatic product/design authority.

---

## North star

Signal should feel like a serious training instrument.

That means:

- fast actions over decoration
- restrained chartreuse over neon branding
- strong hierarchy over card sprawl
- sentence-case clarity over shouty display typography
- gym logging optimised for one-handed speed
- planning and coach review optimised for dense, readable work

---

## Stale screenshot notes

The source screenshots are useful direction, but several decisions changed after they were written.

Do not resurrect old screenshot decisions if the current docs disagree.

Current resolved rules:

- Signal nav follows the current decision register and audit. Nutrition is not a primary Signal nav item; it remains reachable as a secondary route where implemented.
- Coach Home is a task inbox, not a business dashboard.
- AI is utility-only. Do not make AI the product identity.
- Coach reply read receipts are out for v1. Use existing reviewed/feedback-sent state.
- The code currently exposes `gym` and `planning` surface modes. Treat calm client/check-in UI as a tone within planning unless a new surface token is explicitly designed and approved.
- Coach-created plan locks must not block logging reality: clients can still log actuals, substitute, skip, add exercises, and leave sets unlogged during workout execution.
- Week progression is manual, not calendar-automatic.

---

## Surface model

### Gym surface

Use for workout execution, active training, and app chrome.

Direction:

- matte black / near-black surfaces
- off-white ink
- high contrast
- large tappable rows
- minimal decoration
- immediate next action is obvious

Avoid dashboards inside logging, decorative gradients, noisy chips, dense planning controls, and tiny tap targets.

### Planning surface

Use for planning, progress, nutrition, settings, check-ins, notifications, feedback, editors, and reflective screens.

Direction:

- light bone/off-white surface
- hairline borders
- table discipline
- compact rows where appropriate
- dense but readable layouts

Avoid generic card piles, loud coloured chips, and boxed chart ornaments on light pages.

### Calm client/check-in tone

Use for client-facing reviews, coach replies, check-in feedback, and reflective correspondence.

Direction:

- calmer than gym and planning workspaces
- generous line-height
- written feedback should read like correspondence, not a system notification
- serif/italic treatment may be appropriate for coach-authored written notes when an existing token/component supports it

Do not introduce raw warm-bone colours or new surface tokens inside page code. If the current two-surface model is not enough, propose the token/component first.

---

## Chartreuse / signal accent rules

Chartreuse is not decoration. It marks the one thing the user's eye should land on next.

Use it for:

- the primary action, usually at most one per screen
- the active workout logging cell/state
- rare active/focus indicators where the next action would otherwise be ambiguous

Do not use it for:

- branding every card
- secondary actions
- all active tabs/chips by default
- status traffic lights
- decorative glows
- chart series unless it has a clear comparison role

If the screen already has a chartreuse primary CTA, be sceptical of adding another chartreuse element.

---

## Typography rules

Use the existing Signal font tokens.

- Body/default UI: Inter Tight via `signalTokens.fontVar.body`.
- Display headers and large numerals: Archivo Narrow via `signalTokens.fontVar.cond`.
- Labels, metadata, timers, set counts, status microcopy, and tabular numeric UI: JetBrains Mono via `signalTokens.fontVar.mono`.
- Do not introduce new font families.
- Do not use CSS `text-transform: uppercase` for production UI.
- Keep headings sentence case unless there is a specific existing component convention.
- Keep letter spacing restrained; small mono labels can be spaced, but do not turn every heading into tracked caps.
- Numeric cells should use tabular numerals where users compare values.

---

## Layout and density rules

Signal uses different density by job.

Mobile gym logging: optimise for speed, thumb reach, large set inputs, no horizontal overflow, bottom actions clear of mobile nav, and previous performance close to the logging flow.

Desktop planning and coach work: optimise for table/grid discipline, compact rows, hairline dividers, clear inline edit states, and restrained card padding.

Check-ins and client feedback: optimise for reading and response quality with calmer hierarchy, generous line-height for written answers, and attachments/photos that support review without dominating it.

Use the existing spacing/radius tokens. Do not invent arbitrary spacing scales, radii, or shadows in page code.

---

## Component direction

### Home

Home is a command centre.

Priority:

1. Resume Workout if active.
2. Start Next Planned Workout if no active workout.
3. Secondary signals such as week/block progress and compact metrics.

Avoid charts dominating Home, streak counters, generic dashboard grids, stat landfill, and AI prompts as the hero identity.

### Workout logging

Workout logging is the most performance-critical surface.

Rules:

- planned sets are visible upfront as rows to fill in
- last 3 valid previous sessions should be visible or surfaced close to the set rows
- history informs; it does not prescribe automatic load/reps
- active set/cell may use chartreuse emphasis
- weight cells should remain neutral unless they are the explicit active input
- finish workout is explicit
- unlogged sets warning stays simple

Do not make logging slower for visual polish.

### Plan editor

The plan editor should feel like a printed programme card or coach-marked worksheet.

Rules:

- light planning surface
- dense table/sheet behaviour on desktop
- simpler card/classic behaviour on mobile
- mono headers and hairline rules are appropriate
- week/day cells can feel inline-editable
- avoid visual noise around every cell

### Coach Home

Coach Home is a task inbox.

Primary workstreams:

- submitted check-ins needing review
- plan maintenance tasks

Avoid business/admin metrics, engagement dashboards, broad behavioural alert sprawl, and chat-style navigation.

Status should be text plus subtle dot/icon, not colour-only chips.
