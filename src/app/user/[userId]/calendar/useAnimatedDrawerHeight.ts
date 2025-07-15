// hooks/useAnimatedDrawerHeight.ts
import {useEffect, useState} from "react";

export const TRANSITION_MS = 300;

export function useAnimatedDrawerHeight({
                                          open,
                                          selectedMetric,
                                          mainPanelRef,
                                          formPanelRef,
                                          drawerPaperRef
                                        }: {
  open: boolean;
  selectedMetric: string | null;
  mainPanelRef: React.RefObject<HTMLElement | null>;
  formPanelRef: React.RefObject<HTMLElement | null>;
  drawerPaperRef: React.RefObject<HTMLElement | null>;
}) {
  const [height, setHeight] = useState<number | null>(null);

  // Measure panel height when drawer opens
  useEffect(() => {
    if (open) {
      const raf = requestAnimationFrame(() => {
        const panel = selectedMetric ? formPanelRef.current : mainPanelRef.current;
        if (panel) {
          setHeight(panel.offsetHeight)
        }
      });
      return () => cancelAnimationFrame(raf);
    }
  }, [formPanelRef, mainPanelRef, open, selectedMetric]);

  // Animate height changes and observe panel resize
  useEffect(() => {
    if (!open) return;

    let timeout: ReturnType<typeof setTimeout>;
    let cleanupFn: (() => void) | undefined;

    const panel = selectedMetric ? formPanelRef.current : mainPanelRef.current;
    const drawer = drawerPaperRef.current;

    if (drawer && panel) {
      cleanupFn = animationCb(drawer, panel);
    } else { // when event fab used, drawer ref is not set until transition complete
      timeout = setTimeout(() => {
        const panel = selectedMetric ? formPanelRef.current : mainPanelRef.current;
        const drawer = drawerPaperRef.current;
        if (drawer && panel) {
          cleanupFn = animationCb(drawer, panel);
        }
      }, TRANSITION_MS);
    }

    return () => {
      clearTimeout(timeout);
      if (cleanupFn) cleanupFn();
    };
  }, [selectedMetric, mainPanelRef, formPanelRef, drawerPaperRef, open]);


  return height;
}

const animationCb = (drawer: HTMLElement, panel: HTMLElement) => {
  drawer.style.transition = `height ${TRANSITION_MS}ms ease-in-out`;
  drawer.style.height = `${panel.offsetHeight}px`;

  const resizeObserver = new ResizeObserver(() => {
    drawer.style.height = `${panel.offsetHeight}px`;
  });
  resizeObserver.observe(panel);

  return () => {
    resizeObserver.unobserve(panel);
    resizeObserver.disconnect();
  };
}
