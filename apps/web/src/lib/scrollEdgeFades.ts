// Platform-agnostic scroll-edge-fade computation. Given scroll metrics
// (offset, viewport size, content size), decide whether to show
// start/end fade gradients. Used by the web hook (DOM measurements) and
// reusable for an RN equivalent (onScroll/onLayout metrics).

export type ScrollFadeMetrics = {
  scrollPosition: number;
  visibleSize: number;
  contentSize: number;
};

export type ScrollFadeState = {
  showStartFade: boolean;
  showEndFade: boolean;
};

export const NO_FADES: ScrollFadeState = {
  showStartFade: false,
  showEndFade: false,
};

export function computeScrollFades(
  {scrollPosition, visibleSize, contentSize}: ScrollFadeMetrics,
  threshold = 1,
): ScrollFadeState {
  const maxScroll = Math.max(contentSize - visibleSize, 0);
  const scrollable = maxScroll > threshold;
  if (!scrollable) return NO_FADES;
  const atStart = scrollPosition <= threshold;
  const atEnd = scrollPosition >= maxScroll - threshold;
  return {
    showStartFade: !atStart,
    showEndFade: !atEnd,
  };
}
