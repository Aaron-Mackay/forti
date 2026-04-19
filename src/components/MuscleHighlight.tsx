'use client';

import {useInsertionEffect} from 'react';
import {Box} from '@mui/material';
import FrontBody from './front.svg';
import BackBody from './back.svg';
import {MUSCLE_PRIMARY_COLOUR, MUSCLE_SECONDARY_COLOUR} from '@lib/theme';
import { ExerciseMuscle, MUSCLE_QUADRANTS, MuscleQuadrant } from '@/types/dataTypes';

const BODY_SPLIT_POINT = 0.56;

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
    return () => { document.head.removeChild(el); };
  }, [css]);

  if (primaryMuscles.length === 0 && secondaryMuscles.length === 0 && !alwaysShow) return null;

  const visibleQuadrants = filterByQuadrants
    ? getVisibleQuadrants(primaryMuscles, secondaryMuscles)
    : null;

  if (filterByQuadrants && visibleQuadrants?.size === 0) {
    return null;
  }

  const renderHalf = (side: 'front' | 'back', half: 'top' | 'bottom') => {
    const key = `${side}-${half}` as MuscleQuadrant;
    if (filterByQuadrants && !visibleQuadrants?.has(key)) return null;

    const SvgComponent = side === 'front' ? FrontBody : BackBody;

    return (
      <Box
        key={key}
        sx={{
          width: '50%',
          height: '50%',
          overflow: 'hidden',
          display: 'flex',
          alignItems: half === 'top' ? 'flex-start' : 'flex-end',
          justifyContent: 'center',
        }}
      >
        <SvgComponent
          style={{
            width: 'auto',
            height: `${Math.round((1 / BODY_SPLIT_POINT) * 100)}%`,
            transform: half === 'top'
              ? 'translateY(0%)'
              : `translateY(-${Math.round(BODY_SPLIT_POINT * 100)}%)`,
          }}
        />
      </Box>
    );
  };

  return (
    <Box id={id} sx={{display: 'flex', gap: 0.5, height: '100%', width: '100%'}}>
      {filterByQuadrants ? (
        <Box sx={{display: 'flex', flexWrap: 'wrap', width: '100%', height: '100%'}}>
          {renderHalf('front', 'top')}
          {renderHalf('front', 'bottom')}
          {renderHalf('back', 'top')}
          {renderHalf('back', 'bottom')}
        </Box>
      ) : (
        <>
          <FrontBody style={{height: '100%', width: 'auto'}}/>
          <BackBody style={{height: '100%', width: 'auto'}}/>
        </>
      )}
    </Box>
  );
}
