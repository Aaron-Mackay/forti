'use client';

import { Box, Dialog, IconButton, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { useEffect, type KeyboardEvent } from 'react';
import { APPBAR_HEIGHT, HEIGHT_EXC_APPBAR } from '@/components/shell/CustomAppBar';

export type PhotoAngle = 'front' | 'side' | 'back';

export interface PhotoViewerHistory {
  weekLabel: string;
  angle: PhotoAngle;
  availableAngles: PhotoAngle[];
  canPrev: boolean;
  canNext: boolean;
  onAngleChange: (angle: PhotoAngle) => void;
  onPrev: () => void;
  onNext: () => void;
}

interface Props {
  photo: { src: string; alt: string } | null;
  onClose: () => void;
  history?: PhotoViewerHistory;
}

const ANGLE_LABEL: Record<PhotoAngle, string> = {
  front: 'Front',
  side: 'Side',
  back: 'Back',
};

export default function PhotoViewerDialog({ photo, onClose, history }: Props) {
  const open = photo !== null;

  useEffect(() => {
    if (!open || !history) return;
    const handler = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'ArrowLeft' && history.canPrev) {
        event.preventDefault();
        history.onPrev();
      } else if (event.key === 'ArrowRight' && history.canNext) {
        event.preventDefault();
        history.onNext();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, history]);

  const handleAngleKey = (event: KeyboardEvent<HTMLDivElement>) => {
    event.stopPropagation();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      slotProps={{
        paper: {
          sx: {
            bgcolor: 'black',
            position: 'relative',
            overflow: 'hidden',
            mt: `${APPBAR_HEIGHT}px`,
            maxHeight: HEIGHT_EXC_APPBAR,
            width: 'fit-content',
            maxWidth: '90vw',
          },
        },
      }}
    >
      <IconButton
        onClick={onClose}
        aria-label="Close photo viewer"
        sx={{
          position: 'absolute',
          top: 8,
          right: 8,
          zIndex: 2,
          color: 'white',
          bgcolor: 'rgba(0,0,0,0.5)',
          '&:hover': { bgcolor: 'rgba(0,0,0,0.68)' },
        }}
      >
        <CloseIcon />
      </IconButton>

      {history && (
        <Box
          onKeyDown={handleAngleKey}
          sx={{
            position: 'absolute',
            top: 8,
            left: 8,
            zIndex: 2,
            bgcolor: 'rgba(0,0,0,0.5)',
            borderRadius: 1,
            p: 0.5,
          }}
        >
          <ToggleButtonGroup
            size="small"
            exclusive
            value={history.angle}
            onChange={(_, val: PhotoAngle | null) => {
              if (val) history.onAngleChange(val);
            }}
            aria-label="Photo angle"
          >
            {history.availableAngles.map(angle => (
              <ToggleButton
                key={angle}
                value={angle}
                sx={{
                  color: 'white',
                  borderColor: 'rgba(255,255,255,0.3)',
                  '&.Mui-selected': { bgcolor: 'rgba(255,255,255,0.18)', color: 'white' },
                  '&.Mui-selected:hover': { bgcolor: 'rgba(255,255,255,0.28)' },
                }}
              >
                {ANGLE_LABEL[angle]}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        </Box>
      )}

      {photo && (
        <Box
          component="img"
          src={photo.src}
          alt={photo.alt}
          sx={{
            display: 'block',
            maxWidth: '90vw',
            maxHeight: HEIGHT_EXC_APPBAR,
            objectFit: 'contain',
            bgcolor: 'black',
          }}
        />
      )}

      {history && (
        <Box
          sx={{
            position: 'absolute',
            bottom: 8,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 2,
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            bgcolor: 'rgba(0,0,0,0.5)',
            borderRadius: 999,
            px: 1.5,
            py: 0.5,
          }}
        >
          <IconButton
            size="small"
            disabled={!history.canPrev}
            onClick={history.onPrev}
            aria-label="Previous week"
            sx={{ color: 'white', '&.Mui-disabled': { color: 'rgba(255,255,255,0.3)' } }}
          >
            <ChevronLeftIcon />
          </IconButton>
          <Typography variant="body2" sx={{ color: 'white', minWidth: 120, textAlign: 'center' }}>
            {history.weekLabel}
          </Typography>
          <IconButton
            size="small"
            disabled={!history.canNext}
            onClick={history.onNext}
            aria-label="Next week"
            sx={{ color: 'white', '&.Mui-disabled': { color: 'rgba(255,255,255,0.3)' } }}
          >
            <ChevronRightIcon />
          </IconButton>
        </Box>
      )}
    </Dialog>
  );
}
