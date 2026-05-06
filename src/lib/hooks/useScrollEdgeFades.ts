'use client';

import {useCallback, useEffect, useRef, useState} from 'react';
import type {RefObject} from 'react';
import {NO_FADES, computeScrollFades} from '@lib/scrollEdgeFades';

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

function readDomMetrics(node: HTMLElement, axis: ScrollAxis) {
  return axis === 'x'
    ? {
        scrollPosition: node.scrollLeft,
        visibleSize: node.clientWidth,
        contentSize: node.scrollWidth,
      }
    : {
        scrollPosition: node.scrollTop,
        visibleSize: node.clientHeight,
        contentSize: node.scrollHeight,
      };
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
      setShowStartFade(NO_FADES.showStartFade);
      setShowEndFade(NO_FADES.showEndFade);
      return;
    }

    const node = scrollRef.current;
    if (!node) return;

    const next = computeScrollFades(readDomMetrics(node, axis), threshold);
    setShowStartFade(next.showStartFade);
    setShowEndFade(next.showEndFade);
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
