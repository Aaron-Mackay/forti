# Theme Token Usage Guide

## When to use theme tokens

Use shared tokens from `src/lib/theme.ts` whenever a value is part of the product's visual language:

- **Semantic colors:** status states, metrics/macros, chart lines, surfaces/backgrounds.
- **Spacing/radius/elevation:** consistent card padding, corner rounding, shadows.
- **Motion:** transition durations/easing for interactions.

These should be your default for reusable UI and all high-traffic screens.

## Theme token sources

- **MUI components / `sx`:** use MUI palette aliases (for example `primary.main`, `text.secondary`, `action.selected`) or `theme.fortiTokens` in callback-style `sx`.
- **Non-MUI consumers (charts/SVG/CSS strings):** use `nonMuiTokens` / `colorTokens` exports from `src/lib/theme.ts`.

```ts
import { colorTokens, nonMuiTokens } from '@lib/theme';

const chartColors = [colorTokens.brand.primary, colorTokens.status.success];
const sparklineBorder = `1px solid ${colorTokens.surface.borderStrong}`;
const enterMs = nonMuiTokens.motion.duration.standard;
```

## When local one-off `sx` is okay

Use local one-off values only when all of the following are true:

1. The style is highly component-specific and unlikely to be reused.
2. It does not encode a shared semantic meaning (status, brand, hierarchy level).
3. Converting it to a token would add noise without improving consistency.

If a local value appears in **2+ places**, promote it to a token.
