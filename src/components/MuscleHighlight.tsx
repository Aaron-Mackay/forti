import {Box} from '@mui/material';
import FrontBody from './front.svg';
import BackBody from './back.svg';

export default function MuscleHighlight({muscles, exerciseId}: {muscles: string[]; exerciseId: number}) {
  if (muscles.length === 0) return null;

  const id = `anatomy-${exerciseId}`;
  const css = muscles
    .map(k => `#${id} [data-muscle="${k}"] { fill: #e8453c !important; }`)
    .join('\n');

  return (
    <Box id={id} sx={{display: 'flex', justifyContent: 'center', gap: 1, my: 1}}>
      <style>{css}</style>
      <Box sx={{width: 80}}><FrontBody/></Box>
      <Box sx={{width: 80}}><BackBody/></Box>
    </Box>
  );
}
