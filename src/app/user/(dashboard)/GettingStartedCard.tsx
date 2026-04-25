'use client';

import { useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  IconButton,
  LinearProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Typography,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import CloseIcon from '@mui/icons-material/Close';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import Link from 'next/link';
import { useSettings } from '@lib/providers/SettingsProvider';
import { useApiGet } from '@lib/hooks/api/useApiGet';
import type { CheckInHistoryResponse } from '@lib/contracts/checkIn';
import { MetricPrisma, PlanPrisma, WeekPrisma, WorkoutPrisma, UserPrisma } from '@/types/dataTypes';
import { convertDateToDateString } from '@lib/dateUtils';

interface Props {
  userData: UserPrisma | null;
  metrics: MetricPrisma[];
  today: Date;
}

export default function GettingStartedCard({ userData, metrics, today }: Props) {
  const { settings, loading, updateSetting } = useSettings();

  // Only fetch check-in data while the card is visible
  const { data: checkInData } = useApiGet<CheckInHistoryResponse>(
    !settings.onboardingDismissed ? '/api/check-in?limit=1' : null
  );

  const todayStr = convertDateToDateString(today);

  const steps = [
    {
      label: 'Create your first plan',
      done: (userData?.plans.length ?? 0) > 0,
      href: '/user/plan/create',
    },
    {
      label: 'Log today\'s metrics',
      done: metrics.some(m => convertDateToDateString(new Date(m.date)) === todayStr),
      href: '/user/calendar',
    },
    {
      label: 'Complete your check-in',
      done: (checkInData?.checkIns ?? []).some(c => c.completedAt !== null),
      href: '/user/check-in',
    },
    {
      label: 'Do your first workout',
      done: userData?.plans.some((p: PlanPrisma) =>
        p.weeks.some((w: WeekPrisma) => w.workouts.some((wo: WorkoutPrisma) => wo.dateCompleted !== null))
      ) ?? false,
      href: '/user/workout',
    },
  ];

  const completedCount = steps.filter(s => s.done).length;
  const allDone = completedCount === steps.length;

  // Auto-dismiss after a short celebratory delay when all steps are complete
  useEffect(() => {
    if (!allDone) return;
    const t = setTimeout(() => updateSetting('onboardingDismissed', true), 2000);
    return () => clearTimeout(t);
  }, [allDone, updateSetting]);

  if (loading || settings.onboardingDismissed) return null;

  return (
    <Card variant="outlined" sx={{ mb: 2 }}>
      <CardContent sx={{ pb: '16px !important' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
          <Typography variant="overline" color="text.secondary" sx={{ flexGrow: 1 }}>
            {allDone ? "You're all set!" : 'Getting Started'}
          </Typography>
          <IconButton
            size="small"
            onClick={() => updateSetting('onboardingDismissed', true)}
            aria-label="Dismiss getting started guide"
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>

        <List dense disablePadding sx={{ mb: 1.5 }}>
          {steps.map(({ label, done, href }) => (
            <ListItem
              key={label}
              disableGutters
              disablePadding
              component={done ? 'div' : Link}
              href={done ? undefined : href}
              sx={{
                borderRadius: 1,
                px: 0.5,
                ...(done ? {} : {
                  '&:hover': { bgcolor: 'action.hover' },
                  cursor: 'pointer',
                }),
              }}
            >
              <ListItemIcon sx={{ minWidth: 36 }}>
                {done
                  ? <CheckCircleIcon fontSize="small" color="success" />
                  : <RadioButtonUncheckedIcon fontSize="small" color="disabled" />
                }
              </ListItemIcon>
              <ListItemText
                primary={label}
                primaryTypographyProps={{
                  variant: 'body2',
                  color: done ? 'text.secondary' : 'text.primary',
                  sx: done ? { textDecoration: 'line-through' } : {},
                }}
              />
              {!done && <ChevronRightIcon fontSize="small" color="action" />}
            </ListItem>
          ))}
        </List>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <LinearProgress
            variant="determinate"
            value={(completedCount / steps.length) * 100}
            sx={{ flexGrow: 1, borderRadius: 1, height: 6 }}
            color={allDone ? 'success' : 'primary'}
          />
          <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
            {allDone ? 'nice work' : `${completedCount} of ${steps.length}`}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
}
