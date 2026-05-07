'use client';

import {useInsertionEffect} from 'react';
import {Box} from '@mui/material';
import FrontBody from './front.svg';
import BackBody from './back.svg';
import {MUSCLE_PRIMARY_COLOUR, MUSCLE_SECONDARY_COLOUR} from '@lib/theme';
import {ExerciseMuscle, MUSCLE_QUADRANTS, MuscleQuadrant} from '@/types/dataTypes';

type BodySide = 'front' | 'back';
type BodyHalf = 'top' | 'bottom';

const TOP_HALF_SPLIT_POINT = 0.52;
const BOTTOM_HALF_SPLIT_POINT = 0.58;
const HALF_EDGE_FADE_SIZE = '5%';

function getVisibleQuadrants(primaryMuscles: string[], secondaryMuscles: string[]): Set<MuscleQuadrant> {
  const quadrants = new Set<MuscleQuadrant>();
  for (const muscle of [...primaryMuscles, ...secondaryMuscles]) {
    if ((muscle as ExerciseMuscle) in MUSCLE_QUADRANTS) {
      quadrants.add(MUSCLE_QUADRANTS[muscle as ExerciseMuscle]);
    }
  }
  return quadrants;
}

export default function MuscleHighlight({
  primaryMuscles,
  secondaryMuscles = [],
  exerciseId,
  alwaysShow,
  filterByQuadrants,
}: {
  primaryMuscles: string[];
  secondaryMuscles?: string[];
  exerciseId: number;
  alwaysShow?: boolean;
  filterByQuadrants?: boolean;
}) {
  const id = `anatomy-${exerciseId}`;
  const css = [
    ...primaryMuscles.map(k => `#${id} [data-muscle="${k}"] { fill: ${MUSCLE_PRIMARY_COLOUR} !important; }`),
    ...secondaryMuscles.map(k => `#${id} [data-muscle="${k}"] { fill: ${MUSCLE_SECONDARY_COLOUR} !important; }`),
  ].join('\n');

  // useInsertionEffect is a no-op on the server, so no <style> appears in the
  // server-rendered HTML. On the client it fires synchronously before paint,
  // injecting the scoped rule into <head> and cleaning up on unmount.
  // This avoids the React 19 hydration error (#418) caused by React 19
  // automatically hoisting <style> elements from component trees to <head>.
  useInsertionEffect(() => {
    if (!css) return;
    const el = document.createElement('style');
    el.textContent = css;
    document.head.appendChild(el);
    return () => {
      document.head.removeChild(el);
    };
  }, [css]);

  if (primaryMuscles.length === 0 && secondaryMuscles.length === 0 && !alwaysShow) return null;

  const visibleQuadrants = filterByQuadrants
    ? getVisibleQuadrants(primaryMuscles, secondaryMuscles)
    : null;

  if (filterByQuadrants && visibleQuadrants?.size === 0 && !alwaysShow) {
    return null;
  }

  const renderFullSide = (side: BodySide) => {
    const SvgComponent = side === 'front' ? FrontBody : BackBody;
    return <SvgComponent key={side} style={{height: '100%', width: 'auto'}}/>;
  };

  const renderHalf = (side: BodySide, half: BodyHalf) => {
    const key = `${side}-${half}` as MuscleQuadrant;
    const isVisible = !filterByQuadrants || visibleQuadrants?.has(key);

    const SvgComponent = side === 'front' ? FrontBody : BackBody;
    const splitPoint = half === 'top' ? TOP_HALF_SPLIT_POINT : BOTTOM_HALF_SPLIT_POINT;
    const maskImage = half === 'top'
      ? `linear-gradient(to bottom, black calc(100% - ${HALF_EDGE_FADE_SIZE}), transparent 100%)`
      : `linear-gradient(to top, black calc(100% - ${HALF_EDGE_FADE_SIZE}), transparent 100%)`;

    return (
      <Box
        key={key}
        sx={{
          width: '100%',
          height: '100%',
          overflow: 'hidden',
          display: 'flex',
          alignItems: half === 'top' ? 'flex-start' : 'flex-end',
          justifyContent: 'center',
          maskImage,
          WebkitMaskImage: maskImage,
        }}
      >
        {isVisible && (
          <SvgComponent
            style={{
              width: 'auto',
              height: `${Math.round((1 / splitPoint) * 100)}%`,
            }}
          />
        )}
      </Box>
    );
  };

  const renderQuadrant = (quadrant: MuscleQuadrant) => {
    const [side, half] = quadrant.split('-') as [BodySide, BodyHalf];
    return renderHalf(side, half);
  };

  const renderQuadrants = (visibleQuadrants: Set<MuscleQuadrant>) => {
    const quadrants = [...visibleQuadrants];
    const frontCount = quadrants.filter(q => q.startsWith('front')).length;
    const backCount = quadrants.filter(q => q.startsWith('back')).length;
    const topCount = quadrants.filter(q => q.endsWith('top')).length;
    const bottomCount = quadrants.filter(q => q.endsWith('bottom')).length;

    if (quadrants.length === 1) {
      return renderQuadrant(quadrants[0]);
    }

    if (frontCount === 2) {
      return renderFullSide('front');
    }

    if (backCount === 2) {
      return renderFullSide('back');
    }

    if (topCount === 2) {
      return (
        <>
          {renderHalf('front', 'top')}
          {renderHalf('back', 'top')}
        </>
      );
    }

    if (bottomCount === 2) {
      return (
        <>
          {renderHalf('front', 'bottom')}
          {renderHalf('back', 'bottom')}
        </>
      );
    }

    return <>{quadrants.map(renderQuadrant)}</>;
  };

  return (
    <Box
      id={id}
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100%',
        width: '100%',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          gap: 0.5,
          height: '100%',
          maxWidth: '100%',
        }}
      >
        {filterByQuadrants && visibleQuadrants && visibleQuadrants.size > 0 && visibleQuadrants.size < 3
          ? renderQuadrants(visibleQuadrants)
          : (
            <>
              <FrontBody style={{height: '100%', width: 'auto'}}/>
              <BackBody style={{height: '100%', width: 'auto'}}/>
            </>
          )}
      </Box>
    </Box>
  );
}
