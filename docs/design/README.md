# Forti Design Docs

This is the design entrypoint for Forti. Use this file to decide which design document is authoritative for a UI, product, or implementation question.

## Current source of truth

Read these first:

1. [`stage-1-decision-register.md`](./stage-1-decision-register.md)
   - Product identity
   - target users and app modes
   - information architecture and navigation
   - training, coaching, check-in, nutrition, and progress workflow rules
   - Signal visual direction
   - known implementation gaps
   - implementation audit checklist

2. [`signal-agent-guardrails.md`](./signal-agent-guardrails.md)
   - Rules for making Signal UI changes
   - token usage
   - Signal surface model
   - typography constraints
   - mobile and accessibility expectations
   - verification expectations after page tweaks

3. [`signal-system-direction.md`](./signal-system-direction.md)
   - Fast visual-direction guide distilled from the Stage 5 Signal screenshots
   - Signal tone, accent, typography, surface, density, and component-direction rules
   - Explicit stale-screenshot notes where later Forti decisions override older screenshot direction
   - Agent review triggers for UI work

4. [`signal-audit.md`](./signal-audit.md)
   - Current Signal implementation audit
   - pass / partial / missing status by product area
   - working punch list for design/implementation gaps

5. [`signal-ui-qa-checklist.md`](./signal-ui-qa-checklist.md)
   - Manual QA checklist for Signal UI
   - route/state matrix
   - seed-data suggestions
   - highest-risk routes to inspect first

6. [`stage5-signal-review.md`](./stage5-signal-review.md)
   - Original Signal design review against the repo
   - implementation risks
   - missing schema/API support noted at review time
   - safest implementation slices
   - resolved decisions from the review

## Authority hierarchy

When documents conflict, use this order unless a newer document explicitly supersedes an older one:

1. Locked product and UX decisions in `stage-1-decision-register.md`.
2. Current Signal guardrails in `signal-agent-guardrails.md`.
3. Signal visual-direction shortcut in `signal-system-direction.md`, only where it does not conflict with the two files above.
4. Current implementation audit status in `signal-audit.md`.
5. Route-specific QA expectations in `signal-ui-qa-checklist.md`.
6. Historical reviews, design options, and archived notes.
7. Current code, when it conflicts with locked design decisions.

Current code is evidence. It is not automatically the product/design source of truth.

## For implementation agents

Before UI work:

1. Read this file.
2. Read `stage-1-decision-register.md` for product intent and locked decisions.
3. Read `signal-agent-guardrails.md` before touching Signal UI code.
4. Read `signal-system-direction.md` to preserve the intended Signal tone and avoid screenshot-era stale directions.
5. Use `signal-audit.md` to understand current implementation status.
6. Use `signal-ui-qa-checklist.md` to choose relevant manual checks.

Classify the change before editing:

- product / IA change
- page-local visual change
- shared-component change
- token / design-system change
- schema / API / data-model change

Prefer the smallest page-local change unless the problem is genuinely shared.

## Current design direction

Forti's current visual direction is Signal:

- matte black gym/performance surfaces
- chartreuse signal/action accent used sparingly
- large readable numerals
- fast mobile gym logging
- lighter dense planning and coach surfaces (also used for check-ins, notifications, and feedback)

The app should feel like a serious training product, not a generic habit tracker, analytics dashboard, food database, or AI-chat product.

## Historical and supporting docs

Other files in this directory may be useful as historical context, audits, or planning notes. They are not automatically authoritative unless linked from the current source-of-truth list above.

When a design doc becomes stale, either move it under `docs/archive/` or mark it clearly at the top with its replacement.
