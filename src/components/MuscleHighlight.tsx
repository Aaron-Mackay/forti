import {Box} from '@mui/material';
import FrontBody from './front.svg';
import BackBody from './back.svg';

export default function MuscleHighlight({muscles, exerciseId, size = 80}: {muscles: string[]; exerciseId: number; size?: number}) {
  if (muscles.length === 0) return null;

  const id = `anatomy-${exerciseId}`;
  const css = muscles
    .map(k => `#${id} [data-muscle="${k}"] { fill: #e8453c !important; }`)
    .join('\n');

  return (
    <Box id={id} sx={{display: 'flex', gap: 0.5}}>
      <style>{css}</style>
      <Box sx={{width: size}}><FrontBody/></Box>
      <Box sx={{width: size}}><BackBody/></Box>
    </Box>
  );
}
