'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';

type ScrollAxis = 'x' | 'y';

interface UseScrollEdgeFadesOptions {
  axis?: ScrollAxis;
  enabled?: boolean;
  threshold?: number;
}

interface UseScrollEdgeFadesResult<T extends HTMLElement> {
  scrollRef: RefObject<T | null>;
  showStartFade: boolean;
  showEndFade: boolean;
  handleScroll: () => void;
  updateFades: () => void;
}

export function useScrollEdgeFades<T extends HTMLElement>({
  axis = 'y',
  enabled = true,
  threshold = 1,
}: UseScrollEdgeFadesOptions = {}): UseScrollEdgeFadesResult<T> {
  const scrollRef = useRef<T | null>(null);
  const [showStartFade, setShowStartFade] = useState(false);
  const [showEndFade, setShowEndFade] = useState(false);

  const updateFades = useCallback(() => {
    if (!enabled) {
      setShowStartFade(false);
      setShowEndFade(false);
      return;
    }

    const node = scrollRef.current;
    if (!node) return;

    const scrollPosition = axis === 'x' ? node.scrollLeft : node.scrollTop;
    const visibleSize = axis === 'x' ? node.clientWidth : node.clientHeight;
    const contentSize = axis === 'x' ? node.scrollWidth : node.scrollHeight;
    const maxScroll = Math.max(contentSize - visibleSize, 0);
    const scrollable = maxScroll > threshold;
    const atStart = scrollPosition <= threshold;
    const atEnd = scrollPosition >= maxScroll - threshold;

    setShowStartFade(scrollable && !atStart);
    setShowEndFade(scrollable && !atEnd);
  }, [axis, enabled, threshold]);

  const handleScroll = useCallback(() => {
    updateFades();
  }, [updateFades]);

  useEffect(() => {
    updateFades();
    if (!enabled) return;

    const onResize = () => updateFades();
    window.addEventListener('resize', onResize);

    const node = scrollRef.current;
    if (!node) {
      return () => {
        window.removeEventListener('resize', onResize);
      };
    }

    const resizeObserver = new ResizeObserver(() => updateFades());
    resizeObserver.observe(node);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', onResize);
    };
  }, [enabled, updateFades]);

  return {
    scrollRef,
    showStartFade,
    showEndFade,
    handleScroll,
    updateFades,
  };
}
