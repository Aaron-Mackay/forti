'use client';

import { Box, Dialog, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { APPBAR_HEIGHT, HEIGHT_EXC_APPBAR } from '@/components/CustomAppBar';

interface Props {
  photo: { src: string; alt: string } | null;
  onClose: () => void;
}

export default function PhotoViewerDialog({ photo, onClose }: Props) {
  return (
    <Dialog
      open={photo !== null}
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
          zIndex: 1,
          color: 'white',
          bgcolor: 'rgba(0,0,0,0.5)',
          '&:hover': { bgcolor: 'rgba(0,0,0,0.68)' },
        }}
      >
        <CloseIcon />
      </IconButton>
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
    </Dialog>
  );
}
