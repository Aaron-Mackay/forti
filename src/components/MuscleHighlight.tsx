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
    <Box id={id} sx={{display: 'flex', gap: 0.5, height: '100%'}}>
      <style>{css}</style>
      <FrontBody style={{height: '100%', width: 'auto'}}/>
      <BackBody style={{height: '100%', width: 'auto'}}/>
    </Box>
  );
}
