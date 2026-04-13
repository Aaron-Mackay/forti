import { Box } from '@mui/material';

interface Props {
  src: string | null;
  alt: string;
  onClick?: (src: string, alt: string) => void;
}

export default function CheckInPhotoTile({ src, alt, onClick }: Props) {
  if (!src) {
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

  return (
    <Box
      component="img"
      src={src}
      alt={alt}
      onClick={() => onClick?.(src, alt)}
      sx={{
        width: '100%',
        aspectRatio: '4 / 5',
        objectFit: 'contain',
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'divider',
        cursor: onClick ? 'zoom-in' : 'default',
      }}
    />
  );
}
