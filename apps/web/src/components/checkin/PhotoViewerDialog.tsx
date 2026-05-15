'use client';

import { Box, IconButton, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { useEffect, type KeyboardEvent } from 'react';
import { Overlay } from '@/components/signal/overlay';

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
    <Overlay
      open={open}
      onClose={onClose}
      title={photo?.alt ?? 'Photo'}
      eyebrow={history?.weekLabel}
      size="xl"
      height="tall"
    >
      <Box sx={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5, pt: 1, pb: 1 }}>
        {history && (
          <Box onKeyDown={handleAngleKey}>
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
                <ToggleButton key={angle} value={angle}>
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
              maxWidth: '100%',
              maxHeight: '60vh',
              objectFit: 'contain',
              bgcolor: 'black',
              borderRadius: 1,
            }}
          />
        )}

        {history && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <IconButton
              size="small"
              disabled={!history.canPrev}
              onClick={history.onPrev}
              aria-label="Previous week"
            >
              <ChevronLeftIcon />
            </IconButton>
            <Typography variant="body2" sx={{ minWidth: 120, textAlign: 'center' }}>
              {history.weekLabel}
            </Typography>
            <IconButton
              size="small"
              disabled={!history.canNext}
              onClick={history.onNext}
              aria-label="Next week"
            >
              <ChevronRightIcon />
            </IconButton>
          </Box>
        )}
      </Box>
    </Overlay>
  );
}
