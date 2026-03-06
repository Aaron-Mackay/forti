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
  if (primaryMuscles.length === 0 && secondaryMuscles.length === 0 && !alwaysShow) return null;

  const id = `anatomy-${exerciseId}`;
  const primaryCss = primaryMuscles
    .map(k => `#${id} [data-muscle="${k}"] { fill: #e8453c !important; }`)
    .join('\n');
  const secondaryCss = secondaryMuscles
    .map(k => `#${id} [data-muscle="${k}"] { fill: #f5a623 !important; }`)
    .join('\n');

  return (
    <Box id={id} sx={{display: 'flex', gap: 0.5, height: '100%'}}>
      <style>{primaryCss}{'\n'}{secondaryCss}</style>
      <FrontBody style={{height: '100%', width: 'auto'}}/>
      <BackBody style={{height: '100%', width: 'auto'}}/>
    </Box>
  );
}
