import { Box, CircularProgress } from '@mui/material';

export default function UserLoading() {
  return (
    <Box
      sx={{
        minHeight: 240,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        py: 6,
      }}
    >
      <CircularProgress aria-label="Loading..." />
    </Box>
  );
}
