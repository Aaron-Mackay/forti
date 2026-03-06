'use client';

import {useInsertionEffect} from 'react';
import {Box} from '@mui/material';
import FrontBody from './front.svg';
import BackBody from './back.svg';

export default function MuscleHighlight({
  primaryMuscles,
  secondaryMuscles = [],
  exerciseId,
  alwaysShow,
}: {
  primaryMuscles: string[];
  secondaryMuscles?: string[];
  exerciseId: number;
  alwaysShow?: boolean;
}) {
  const id = `anatomy-${exerciseId}`;
  const css = [
    ...primaryMuscles.map(k => `#${id} [data-muscle="${k}"] { fill: #e8453c !important; }`),
    ...secondaryMuscles.map(k => `#${id} [data-muscle="${k}"] { fill: #f5a623 !important; }`),
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

  return (
    <Box id={id} sx={{display: 'flex', gap: 0.5, height: '100%'}}>
      <FrontBody style={{height: '100%', width: 'auto'}}/>
      <BackBody style={{height: '100%', width: 'auto'}}/>
    </Box>
  );
}
