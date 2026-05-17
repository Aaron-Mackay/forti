Before making any Signal UI changes, follow these rules.

1. Treat `apps/web/src/lib/signal/tokens.ts` as the source of truth.
    - Do not introduce raw hex colours, random rgba values, new shadows, new radii, or new spacing scales inside page components.
    - Use `signalTokens.surface.gym` or `signalTokens.surface.planning`.
    - Current-code review may tolerate documented raw colour exceptions for third-party library CSS variables, camera/photo overlays, real-world plate colours, media/video affordance colours, and generated alpha tints while a token is missing. Treat other raw colours as token drift and fix them opportunistically.

2. Preserve the existing Signal surface model.
    - `gym` = workout / active training / app chrome.
    - `planning` = everything else (planning, progress, nutrition, settings, check-ins, notifications, feedback, editor/reflective screens).

3. Preserve the Signal shell behaviour.
    - Do not replace `SignalAppShell`, `SignalSurface`, `SignalSidebar`, `SignalTopBar`, or `SignalBottomNav` unless the task explicitly targets shell chrome.
    - Keep desktop sidebar and mobile top/bottom nav behaviour intact.

4. Make page-level changes locally.
    - When tweaking a page, prefer changes inside that route/component only.
    - Do not refactor unrelated routes.
    - Do not move shared components unless at least two pages need the same fix.
    - Do not alter data fetching, mutation logic, routing, feature flags, permissions, or API behaviour for visual-only requests.
    - For buttons, toggles, segmented controls, and card frames in new Signal surfaces, use the existing primitives (`SignalButton`, `SignalToggle`, `SignalSegmented`, `SignalSectionCard` under `apps/web/src/components/signal/`) instead of re-skinning MUI components per call site. The Signal MUI theme override path is reserved for app-wide changes coordinated separately.

5. Keep Signal visually restrained.
    - Avoid dashboard creep.
    - Avoid adding large charts/cards just to fill space.
    - Avoid making AI/coach/business features visually dominant unless the page purpose requires it.
    - Preserve compact, practical layouts over decorative UI.

6. Use existing typography rules.
    - Body text should use `signalTokens.fontVar.body`.
    - Condensed display/header text should use `signalTokens.fontVar.cond`.
    - Labels, small metadata, and numeric/status microcopy can use `signalTokens.fontVar.mono`.
    - Coach-authored correspondence may use `signalTokens.font.serif` when the surrounding Signal component already supports the calm check-in/client feedback tone.
    - Do not introduce new font families.

7. Respect mobile-first constraints.
    - Check narrow mobile, tablet, and desktop.
    - Do not introduce horizontal overflow.
    - Keep primary actions reachable.
    - Ensure bottom actions are not hidden behind mobile nav.
    - Keep touch targets usable.

8. Preserve accessibility.
    - Maintain visible focus rings.
    - Preserve semantic buttons/links.
    - Do not remove `aria-current`, labels, headings, or accessible names.
    - Check contrast whenever changing foreground/background combinations.

9. Preserve legacy/flagged behaviour.
    - Where a route has `signalUiEnabled` branching, do not break the legacy branch.
    - Do not remove test ids or existing click targets unless the tests are updated intentionally.

10. After each page tweak, run the relevant checks.
- Typecheck/lint if available.
- Run targeted tests for the changed route if available.
- Manually inspect at least mobile and desktop.
- Compare against `docs/design/signal-audit.md` and `docs/design/signal-ui-qa-checklist.md`.

For each requested tweak:
- First identify the route/component being changed.
- State whether the change is page-local, shared-component, or token-level.
- Prefer the smallest page-local change.
- List any files changed.
- Do not make unrelated cleanup changes.

If a visual request seems to require new design primitives, stop and propose the primitive first instead of silently adding one-off styles.
