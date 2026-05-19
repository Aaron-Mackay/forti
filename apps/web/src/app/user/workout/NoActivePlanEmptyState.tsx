'use client';

import Link from 'next/link';
import { Box, Button, Container, Stack, Typography } from '@mui/material';
import { useAppBar } from '@lib/providers/AppBarProvider';
import { signalTokens } from '@lib/signal/tokens';

const gymPalette = signalTokens.surface.gym;

export default function NoActivePlanEmptyState({ signalEnabled = false }: { signalEnabled?: boolean }) {
  useAppBar({ title: 'Training' });

  if (signalEnabled) {
    return (
      <div style={{ minHeight: '100dvh', background: gymPalette.bg, color: gymPalette.ink, fontFamily: signalTokens.fontVar.body, padding: '32px 16px 28px' }}>
        <div style={{ maxWidth: 420, margin: '0 auto', textAlign: 'center' }}>
          <div style={{ fontFamily: signalTokens.fontVar.mono, fontSize: 11, color: gymPalette.inkLight, marginBottom: 6, letterSpacing: '0.04em' }}>
            No active plan
          </div>
          <div style={{ fontFamily: signalTokens.fontVar.cond, fontSize: 28, fontWeight: 700, letterSpacing: '-0.015em', lineHeight: 1.1, marginBottom: 12 }}>
            Pick a plan to start training
          </div>
          <div style={{ fontSize: 14, color: gymPalette.inkMid, lineHeight: 1.5, marginBottom: 24 }}>
            Choose one of your plans to begin logging weeks and workouts.
          </div>
          <Link
            href="/user/plan"
            style={{
              display: 'inline-block',
              padding: '12px 20px',
              borderRadius: signalTokens.radii.card,
              background: signalTokens.signal.deep,
              color: gymPalette.bg,
              fontFamily: signalTokens.fontVar.body,
              fontSize: 15,
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            View plans
          </Link>
        </div>
      </div>
    );
  }

  return (
    <Box sx={{ minHeight: '100dvh', bgcolor: 'background.default', color: 'text.primary' }}>
      <Container maxWidth="sm" sx={{ py: 6 }}>
        <Stack spacing={2} alignItems="center" textAlign="center">
          <Typography variant="h6">No active plan</Typography>
          <Typography variant="body2" color="text.secondary">
            Pick a plan to start training.
          </Typography>
          <Button component={Link} href="/user/plan" variant="contained">
            View plans
          </Button>
        </Stack>
      </Container>
    </Box>
  );
}
