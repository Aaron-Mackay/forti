'use client';

import { useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AddIcon from '@mui/icons-material/Add';
import RadioButtonCheckedIcon from '@mui/icons-material/RadioButtonChecked';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import {
  Box,
  Button,
  Card,
  CardHeader,
  CircularProgress,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Snackbar,
  Alert,
  Tooltip,
  Typography,
} from '@mui/material';
import { setActivePlan } from '@lib/clientApi';

type PlanListItem = {
  id: number;
  name: string;
  order: number;
  weekCount: number;
  lastActivityDate: Date | string | null;
  isActive: boolean;
};

function formatLastActivity(value: Date | string | null) {
  if (!value) return 'No activity yet';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'No activity yet';

  return `Last activity ${date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })}`;
}

export default function PlansListCard({
  title,
  emptyMessage,
  createHref,
  planHrefBase,
  plans,
  targetUserId,
}: {
  title: string;
  emptyMessage: string;
  createHref: string;
  planHrefBase: string;
  plans: PlanListItem[];
  targetUserId?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [planItems, setPlanItems] = useState(plans);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  useEffect(() => {
    setPlanItems(plans);
  }, [plans]);

  async function handleSetActive(planId: number | null) {
    setPlanItems((currentPlans) =>
      currentPlans.map((plan) => ({
        ...plan,
        isActive: planId === null ? false : plan.id === planId,
      })),
    );

    try {
      await setActivePlan(planId, targetUserId);
      setSnackbar({
        open: true,
        message: planId === null ? 'Active plan cleared' : 'Active plan updated',
        severity: 'success',
      });
      startTransition(() => {
        router.refresh();
      });
    } catch {
      setPlanItems(plans);
      setSnackbar({
        open: true,
        message: 'Failed to update active plan',
        severity: 'error',
      });
    }
  }

  return (
    <>
      <Card sx={{ display: 'flex', flexDirection: 'column' }}>
        <CardHeader
          title={title}
          action={
            <IconButton
              component={Link}
              href={createHref}
              aria-label="Add plan"
              size="small"
            >
              <AddIcon />
            </IconButton>
          }
        />
        {plans.length === 0 ? (
          <Box sx={{ px: 2, pb: 3, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {emptyMessage}
            </Typography>
            <Button variant="contained" component={Link} href={createHref}>
              Create your first plan
            </Button>
          </Box>
        ) : (
          <List disablePadding>
            {planItems.map((plan) => {
              return (
                <ListItem
                  key={plan.id}
                  disablePadding
                  secondaryAction={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Tooltip title={plan.isActive ? 'Clear active plan' : 'Set as active plan'}>
                        <IconButton
                          edge="end"
                          onClick={() => void handleSetActive(plan.isActive ? null : plan.id)}
                          aria-label={plan.isActive ? `Clear active plan for ${plan.name}` : `Set ${plan.name} as active plan`}
                          color={plan.isActive ? 'primary' : 'default'}
                          disabled={isPending}
                          sx={{
                            width: 44,
                            height: 44,
                            transition: 'transform 120ms ease, opacity 120ms ease',
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
                                opacity: plan.isActive ? 1 : 0,
                                transform: plan.isActive ? 'scale(1)' : 'scale(0.82)',
                                transition: 'opacity 140ms ease, transform 140ms ease',
                              }}
                            />
                            {isPending && (
                              <CircularProgress
                                size={16}
                                sx={{
                                  position: 'absolute',
                                  color: 'currentColor',
                                }}
                              />
                            )}
                          </Box>
                        </IconButton>
                      </Tooltip>
                    </Box>
                  }
                >
                  <ListItemButton component={Link} href={`${planHrefBase}/${plan.id}`} sx={{ pr: 22 }}>
                    <ListItemText
                      primary={plan.name}
                      secondary={`${plan.weekCount} ${plan.weekCount === 1 ? 'week' : 'weeks'} · ${formatLastActivity(plan.lastActivityDate)}`}
                    />
                  </ListItemButton>
                </ListItem>
              );
            })}
          </List>
        )}
      </Card>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((current) => ({ ...current, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar((current) => ({ ...current, open: false }))}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
}
