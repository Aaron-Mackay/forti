# Signal Overlays — Modal + Drawer

Engineering-ready contract for the `<Overlay>` primitive at
`apps/web/src/components/signal/overlay/`.

One logical component, two presentations: **Modal** on desktop (≥1024px),
**Drawer** on mobile (<1024px). Tablets inherit Modal until a dedicated
tablet density pass ships.

This document reflects the contract *as implemented*, including every
decision resolved during the design grilling.

---

## 1 · Component API

```ts
import { Overlay, SkelLine, SkelBlock, SkelRow } from '@/components/signal/overlay';

type OverlayStatus =
  | { state: 'loaded' }
  | { state: 'loading'; cachedAt?: number }     // ms epoch of last successful fetch
  | { state: 'error'; onRetry: () => void; message?: string };

type OverlayAction = {
  label: string;
  onClick: () => void;
  disabled?: boolean;
};

interface OverlayProps {
  open: boolean;
  onClose: () => void;
  title: string;                                  // required, condensed
  eyebrow?: string;                               // mono 11, sentence case
  status?: OverlayStatus;                         // default { state: 'loaded' }
  dirty?: boolean;                                // blocks both Esc and scrim
  initialFocusRef?: RefObject<HTMLElement | null>;
  dismissOnBackdrop?: boolean;                    // default true
  children: ReactNode;

  // Structured actions (preferred). Layout depends on presentation:
  // - Modal: ghost-left, secondary+primary right (horizontal)
  // - Drawer: primary top, secondary, ghost bottom (stacked)
  primaryAction?: OverlayAction;
  secondaryAction?: OverlayAction;
  ghostAction?: OverlayAction;

  // Desktop-only props (no-op on mobile)
  size?: 'sm' | 'md' | 'lg' | 'xl';               // 480 / 640 / 780 / 960; default 'md'
  accent?: boolean;                               // signalDeep left rail

  // Mobile-only props (no-op on desktop)
  height?: 'compact' | 'tall';                    // 'compact' caps at 78vh, 'tall' fixed 88vh
  dismissOnGripDrag?: boolean;                    // default true
}
```

Skeleton primitives:

```tsx
<SkelLine width?={number|string} height?={number} radius?={number} tone?="light"|"dark" />
<SkelBlock width height tone? />
<SkelRow cols={Array<string|number>} height? gap? tone? />
```

Tone defaults inherit from the active surface (planning → light, gym →
dark). All fills are **static** — no animation, no shimmer.

---

## 2 · Tokens

Overlay code consumes existing tokens from `signalTokens` in
`apps/web/src/lib/signal/tokens.ts` — no new tokens, no CSS custom
properties.

| Spec name (informal) | Concrete token | Used for |
| --- | --- | --- |
| Light surface | `signalTokens.surface.planning.surface` | Modal background on planning pages |
| Light surface alt | `signalTokens.surface.planning.surfaceAlt` | Modal footer band |
| Light ink / mid / light / border | `signalTokens.surface.planning.{ink,inkMid,inkLight,border}` | Text + dividers (light) |
| Dark surface (gym) | `signalTokens.surface.gym.surface` | Modal/Drawer background on gym pages |
| Dark ink / mid / ghost / border / borderStrong | `signalTokens.surface.gym.{ink,inkMid,inkGhost,border,borderStrong}` | Text + dividers (dark) |
| Signal accent | `signalTokens.signal.{base,deep,dim}` | Primary button, accent rail, active fill |
| Urgent | `signalTokens.status.urgent` | Error body, "Discard changes?" hint |

The spec called for pure white `#ffffff` for `--surface-light`; we use
planning's cream `#fcfbf7` (one of the planning tokens) deliberately to
stay consistent with the rest of Signal.

---

## 3 · Surface-mode inheritance

`SignalSurfaceContext` (also at `apps/web/src/components/signal/`)
exposes the active `SignalSurfaceMode` ('gym' | 'planning') via React
context. Both `SignalAppShell` and `SignalSurface` wrap their children
in the provider.

**Both Modal and Drawer inherit parent surface mode.** A Modal opened
from a gym workout page renders dark; a Drawer opened from a planning
page renders cream. Presentation (modal geometry vs drawer geometry) is
viewport-driven; palette is parent-driven.

---

## 4 · Anatomy & geometry

### Modal (desktop ≥1024px)

- Frame: 1.5px solid `palette.borderStrong`, radius 4px
- Header reserved height: **64px**, 1px bottom divider
- Footer reserved height: **64px**, background `palette.surfaceAlt`,
  1px top divider
- Body padding: 22px horizontal (26px left if `accent`)
- Optional `accent` rail: 4px-wide `signalTokens.signal.deep` column at
  `left: 0` from top to bottom
- Scrim: `rgba(15,14,11,0.32)` — flat, no blur
- Elevation: planning surface uses a soft tan-tinted drop shadow; gym
  surface uses a deeper near-black shadow
- Close affordance: 28×28 square, 1px border, 3px radius, 10×10 stroke-1.6 × glyph
- Enter/exit: framer-motion fade + 0.96→1 scale, ~150ms ease-out

### Drawer (mobile <1024px)

- Top corners: 10px radius
- Top edge: 1px solid `palette.borderStrong`
- Grip: 36×4 centered 10px above the title
- Compact height: drawer hugs content, capped at 78vh
- Tall height: fixed 88vh — use for pickers/lists with >5 rows
- Body padding: 14px vertical, 18px horizontal
- Footer: stacked vertically — Primary on top, Secondary, Ghost
- Scrim: `rgba(0,0,0,0.55)` — flat, no blur
- Enter/exit: framer-motion translateY slide-from-bottom, spring physics
- Grip drag-to-close: framer-motion pan gesture, threshold ~80px or
  velocity > 500

---

## 5 · Loading lifecycle

Owned by the primitive — consumers just pass a `status` prop and render
their own skeleton in `children`.

1. `state: 'loading'`:
   - If `cachedAt && Date.now() - cachedAt < 60_000` → skip skeleton frame
     entirely (render straight to loaded)
   - Else: 50ms grace timer before showing skeleton — fast fetches never
     flash
   - At 2s still loading → eyebrow text replaced with `Still loading…`
2. `state: 'error'`:
   - Body replaced with mono 12px `status.urgent` line + `Retry` text-link
   - `primaryAction` auto-relabels to `Retry` and calls `onRetry`
3. `state: 'loaded'`: pass-through

Skeletons themselves are **static** — no `@keyframes`, no `animation`,
no opacity oscillation. The spec is deliberate on this; do not add
shimmer.

---

## 6 · Behaviour contracts

| Action | Behavior |
| --- | --- |
| Esc | Close, unless `dirty=true` — then no-op + show "Discard changes?" hint |
| Click scrim | Close *if* `dismissOnBackdrop && !dirty`; else no-op + show hint |
| Drag drawer grip down | Close *if* `dismissOnGripDrag` |
| Focus on open | First input, else primary action (via `initialFocusRef`) |
| Focus trap | MUI Modal handles it |
| Focus return on close | MUI Modal handles it |
| Scroll lock | MUI Modal handles it (refcount-aware) |

Only one Overlay open at a time. Opening a second overlay closes the
first. The primitive itself doesn't enforce this — it leans on MUI
Modal's per-instance Esc handler, scroll-lock refcount, and focus-return
machinery. Honor system; consumers don't nest overlays.

### Dirty state

When `dirty=true`, neither Esc nor scrim click dismiss. Instead an
inline `Discard changes?` hint (mono 11, `status.urgent`) appears in
the header to the left of the close button. The close (×) button then
serves as the explicit discard control — clicking it dismisses the
overlay despite the dirty state.

---

## 7 · Implementation strategy

- Built on **`@mui/material/Modal`** (headless — Portal, FocusTrap,
  scroll lock, ARIA wiring) with MUI's transition bypassed.
- **`framer-motion`** for enter/exit animation and the drawer-grip drag
  gesture (no new dependency — already a dev dep).
- **`@emotion/styled`** (transitive via MUI) for the ~5 places that
  need pseudo-selectors (`:hover`, `:focus-visible`, `:active`) or
  `@media`: `ActionButton`, `CloseButton`, `Grip`, plus the two shell
  roots.
- `signalTokens` referenced via inline `style={{...}}` for everything
  else, matching the convention of `SignalAppShell` and friends.

### Active-shell rendering

Originally planned to mount both shells with CSS `@media` show/hide so
viewport-crossing resize didn't flash. In practice jsdom does not
honour CSS `@media`, so both shell trees rendered duplicate titles in
the test DOM and broke `getByText` queries.

We **render only the active shell** based on
`useMediaQuery('(min-width: 1024px)')`. The resize-flash window (viewport
crosses 1024px *while a modal is open*) is rare; the testing cost was
not. Children still render once at a hidden anchor and `createPortal` into
the active shell's body slot — consumer state never double-mounts.

---

## 8 · Accessibility

- `role="dialog"`, `aria-modal="true"`, `aria-labelledby` → title element
- `eyebrow` is decorative — uses `aria-describedby`, not `aria-labelledby`
- Close button has `aria-label="Close"`
- Focus outline on every interactive element: 2px solid
  `signalTokens.signal.base` with 2px offset
- Skeleton bars are `aria-hidden="true"`
- Drawer grip is keyboard-operable: Tab focuses it, Enter/Space/Esc close
- Touch targets ≥ 44×44 (drawer footer buttons are 50px tall)

---

## 9 · Out of scope (do not build)

- Toast / snackbar — separate primitive
- Right-side drawer ("side sheet") — explicitly out
- Multi-step wizards inside a modal — confirm with design first
- Animated skeleton states — explicitly forbidden
- A "success" full-takeover screen post-action — return to the page
  with a quiet toast instead

## Surfaces NOT migrated to `<Overlay>`

Six surfaces remain on MUI for valid reasons. Re-themed with
`signalTokens` if not already; do not migrate without addressing the
underlying constraint.

| File | Reason |
| --- | --- |
| `apps/web/src/app/user/calendar/EventDetails.tsx` | Anchored Popover (not modal-shaped) |
| `apps/web/src/components/shell/CustomAppBar.tsx` | App-bar Menu (anchored) |
| `apps/web/src/app/exercises/AddExerciseForm.tsx` | Inline anchored Popover |
| `apps/web/src/app/user/check-in/PhotoCaptureModal.tsx` | Canvas + multipointer gesture + fullScreen |
| `apps/web/src/app/user/calendar/CalendarRightDrawer.tsx` | Right-side drawer — out of spec |
| `apps/web/src/app/user/calendar/CalendarBottomDrawer.tsx` | Animated-height multi-view state machine |

---

## 10 · Usage examples

### Confirm modal (sm, accent)

```tsx
<Overlay
  open={open}
  onClose={close}
  size="sm"
  accent
  eyebrow="Confirm · attention"
  title="Send week 4 feedback to Sarah?"
  primaryAction={{ label: 'Send feedback', onClick: send, disabled: isLoading }}
  secondaryAction={{ label: 'Send & adjust targets', onClick: sendAndAdjust }}
  ghostAction={{ label: 'Keep drafting', onClick: close }}
>
  <p>{summary}</p>
  <AdjustmentsStrip items={adjustments} />
</Overlay>
```

### Tall picker drawer (status-driven loading)

```tsx
<Overlay
  open={open}
  onClose={close}
  height="tall"
  eyebrow="Substitute · this workout only"
  title="Pick a replacement"
  status={isLoading ? { state: 'loading', cachedAt: lastFetchedAt } : { state: 'loaded' }}
  ghostAction={{ label: 'Cancel substitution', onClick: close }}
>
  <SearchField placeholder="Search exercises" />
  <FilterChips chips={chips} active="chest" />
  {isLoading ? (
    Array.from({ length: 7 }).map((_, i) => (
      <Stack key={i} gap={6} padding="12px 0" borderBottom>
        <SkelLine width={150} />
        <SkelLine width={110} height={10} />
      </Stack>
    ))
  ) : (
    <ExerciseList items={results} onPick={substitute} />
  )}
</Overlay>
```
