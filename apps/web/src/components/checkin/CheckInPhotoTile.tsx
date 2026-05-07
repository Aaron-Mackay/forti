import { Box } from '@mui/material';
import { useEffect, useState, type KeyboardEvent } from 'react';

interface Props {
  src: string | null;
  alt: string;
  onClick?: (src: string, alt: string) => void;
}

export default function CheckInPhotoTile({ src, alt, onClick }: Props) {
  const [errored, setErrored] = useState(false);

  useEffect(() => {
    setErrored(false);
  }, [src]);

  if (!src || errored) {
    return (
      <Box
        sx={{
          aspectRatio: '4 / 5',
          borderRadius: 2,
          border: '1px dashed',
          borderColor: 'divider',
          bgcolor: 'action.hover',
        }}
      />
    );
  }

  const interactive = Boolean(onClick);
  const handleKeyDown = interactive
    ? (event: KeyboardEvent<HTMLImageElement>) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onClick?.(src, alt);
        }
      }
    : undefined;

  return (
    <Box
      component="img"
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      onClick={interactive ? () => onClick?.(src, alt) : undefined}
      onError={() => setErrored(true)}
      onKeyDown={handleKeyDown}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      sx={{
        width: '100%',
        aspectRatio: '4 / 5',
        objectFit: 'contain',
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'divider',
        cursor: interactive ? 'zoom-in' : 'default',
      }}
    />
  );
}
