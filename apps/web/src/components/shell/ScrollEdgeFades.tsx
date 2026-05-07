'use client';

import { Box } from '@mui/material';
import { alpha } from '@mui/material/styles';

type ScrollAxis = 'x' | 'y';

interface Props {
  axis: ScrollAxis;
  showStart: boolean;
  showEnd: boolean;
  size?: number;
  background?: 'paper' | 'default';
  zIndex?: number;
}

export default function ScrollEdgeFades({
  axis,
  showStart,
  showEnd,
  size = 24,
  background = 'paper',
  zIndex = 1,
}: Props) {
  return (
    <>
      {showStart && (
        <Box
          sx={theme => {
            const bg = background === 'paper' ? theme.palette.background.paper : theme.palette.background.default;
            return axis === 'x'
              ? {
                position: 'absolute',
                top: 0,
                left: 0,
                bottom: 0,
                width: size,
                zIndex,
                pointerEvents: 'none',
                background: `linear-gradient(to left, ${alpha(bg, 0)}, ${bg})`,
              }
              : {
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: size,
                zIndex,
                pointerEvents: 'none',
                background: `linear-gradient(to top, ${alpha(bg, 0)}, ${bg})`,
              };
          }}
        />
      )}

      {showEnd && (
        <Box
          sx={theme => {
            const bg = background === 'paper' ? theme.palette.background.paper : theme.palette.background.default;
            return axis === 'x'
              ? {
                position: 'absolute',
                top: 0,
                right: 0,
                bottom: 0,
                width: size,
                zIndex,
                pointerEvents: 'none',
                background: `linear-gradient(to right, ${alpha(bg, 0)}, ${bg})`,
              }
              : {
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: size,
                zIndex,
                pointerEvents: 'none',
                background: `linear-gradient(to bottom, ${alpha(bg, 0)}, ${bg})`,
              };
          }}
        />
      )}
    </>
  );
}
