'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import RadioButtonCheckedIcon from '@mui/icons-material/RadioButtonChecked';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import {
  Alert,
  Box,
  CircularProgress,
  Container,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Snackbar,
  Tooltip,
  Typography,
} from '@mui/material';
import { useAppBar } from '@lib/providers/AppBarProvider';
import ProgressIcon from '@/lib/ProgressIcon';
import { getPlanStatus } from '@/lib/workoutProgress';
import { setActivePlan } from '@lib/clientApi';
import type {WorkoutDataResponse} from '@lib/contracts/workoutData';
import { signalTokens } from '@lib/signal/tokens';

const gymPalette = signalTokens.surface.gym;

export default function PlansListView({
  userData,
  onSelectPlan,
  signalEnabled = false,
}: {
  userData: WorkoutDataResponse;
  onSelectPlan: (planId: number) => void;
  signalEnabled?: boolean;
}) {
  useAppBar({ title: 'Training' });
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [activePlanId, setActivePlanId] = useState<number | null>(userData.activePlanId);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  async function handleSetActive(planId: number | null) {
    setActivePlanId(planId);

    try {
      await setActivePlan(planId);
      setSnackbar({
        open: true,
        message: planId === null ? 'Active plan cleared' : 'Active plan updated',
        severity: 'success',
      });
      startTransition(() => {
        router.refresh();
      });
    } catch {
      setActivePlanId(userData.activePlanId);
      setSnackbar({
        open: true,
        message: 'Failed to update active plan',
        severity: 'error',
      });
    }
  }

  if (signalEnabled) {
    return (
      <>
        <div style={{ minHeight: '100dvh', background: gymPalette.bg, color: gymPalette.ink, fontFamily: signalTokens.fontVar.body, padding: '14px 16px 28px' }}>
          <div style={{ fontFamily: signalTokens.fontVar.mono, fontSize: 11, color: gymPalette.inkLight, marginBottom: 6 }}>
            Training
          </div>
          <div style={{ fontFamily: signalTokens.fontVar.cond, fontSize: 26, fontWeight: 700, letterSpacing: '-0.015em', lineHeight: 1, marginBottom: 18 }}>
            Your plans
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {userData.plans.map((plan) => {
              const isActive = plan.id === activePlanId;
              return (
                <div
                  key={plan.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    background: gymPalette.surface,
                    border: `1px solid ${isActive ? signalTokens.signal.deep : gymPalette.border}`,
                    borderRadius: signalTokens.radii.card,
                    overflow: 'hidden',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => onSelectPlan(plan.id)}
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: 'transparent',
                      border: 'none',
                      padding: '14px 16px',
                      color: gymPalette.ink,
                      cursor: 'pointer',
                      textAlign: 'left',
                      gap: 12,
                    }}
                  >
                    <span style={{ fontFamily: signalTokens.fontVar.body, fontSize: 15, fontWeight: 500 }}>{plan.name}</span>
                    {isActive && (
                      <span style={{ fontFamily: signalTokens.fontVar.mono, fontSize: 11, color: signalTokens.signal.deep, flexShrink: 0 }}>active</span>
                    )}
                  </button>
                  <button
                    type="button"
                    aria-label={isActive ? `Clear active plan for ${plan.name}` : `Set ${plan.name} as active plan`}
                    disabled={isPending}
                    onClick={() => void handleSetActive(isActive ? null : plan.id)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      borderLeft: `1px solid ${gymPalette.border}`,
                      padding: '0 14px',
                      height: '100%',
                      minHeight: 52,
                      cursor: isPending ? 'wait' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    <span style={{
                      display: 'block',
                      width: 12,
                      height: 12,
                      borderRadius: '50%',
                      background: isActive ? signalTokens.signal.deep : 'transparent',
                      border: `1.5px solid ${isActive ? signalTokens.signal.deep : gymPalette.borderStrong}`,
                      transition: 'background 140ms ease, border-color 140ms ease',
                    }} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
        <Snackbar
          open={snackbar.open}
          autoHideDuration={4000}
          onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert severity={snackbar.severity} onClose={() => setSnackbar((s) => ({ ...s, open: false }))}>
            {snackbar.message}
          </Alert>
        </Snackbar>
      </>
    );
  }

  return (
    <>
      <Box sx={{ minHeight: '100dvh', color: 'text.primary' }}>
        <Container maxWidth="sm" sx={{ py: 2 }}>
          <Typography variant="subtitle1" gutterBottom>
            Plans
          </Typography>
          <List>
            {userData.plans.map((plan) => {
              const isActive = plan.id === activePlanId;
              return (
                <ListItem
                  key={plan.id}
                  disablePadding
                  secondaryAction={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <ProgressIcon status={getPlanStatus(plan)} />
                      <Tooltip title={isActive ? 'Clear active plan' : 'Set as active plan'}>
                        <IconButton
                          edge="end"
                          onClick={() => void handleSetActive(isActive ? null : plan.id)}
                          aria-label={isActive ? `Clear active plan for ${plan.name}` : `Set ${plan.name} as active plan`}
                          color={isActive ? 'primary' : 'default'}
                          disabled={isPending}
                          sx={{
                            width: 44,
                            height: 44,
                            opacity: isPending ? 0.85 : 1,
                          }}
                        >
                          <Box sx={{ position: 'relative', width: 28, height: 28, display: 'grid', placeItems: 'center' }}>
                            <RadioButtonUncheckedIcon sx={{ fontSize: 28, position: 'absolute', inset: 0 }} />
                            <RadioButtonCheckedIcon
                              sx={{
                                fontSize: 28,
                                position: 'absolute',
                                inset: 0,
                                opacity: isActive ? 1 : 0,
                                transform: isActive ? 'scale(1)' : 'scale(0.82)',
                                transition: 'opacity 140ms ease, transform 140ms ease',
                              }}
                            />
                            {isPending && (
                              <CircularProgress
                                size={16}
                                sx={{ position: 'absolute', color: 'currentColor' }}
                              />
                            )}
                          </Box>
                        </IconButton>
                      </Tooltip>
                    </Box>
                  }
                >
                  <ListItemButton onClick={() => onSelectPlan(plan.id)} sx={{ pr: 14 }}>
                    <ListItemText primary={`Plan ${plan.order} - ${plan.name}`} />
                  </ListItemButton>
                </ListItem>
              );
            })}
          </List>
        </Container>
      </Box>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar((s) => ({ ...s, open: false }))}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
}
