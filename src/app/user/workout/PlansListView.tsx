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
import { UserPrisma } from '@/types/dataTypes';
import { useAppBar } from '@lib/providers/AppBarProvider';
import ProgressIcon from '@/lib/ProgressIcon';
import { getPlanStatus } from '@/lib/workoutProgress';
import { setActivePlan } from '@lib/clientApi';

export default function PlansListView({
  userData,
  onSelectPlan,
}: {
  userData: UserPrisma;
  onSelectPlan: (planId: number) => void;
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
