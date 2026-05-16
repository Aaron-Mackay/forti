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
