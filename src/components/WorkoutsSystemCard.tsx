'use client';

import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import FrontBody from '@/components/front.svg';
import BackBody from '@/components/back.svg';
import {Box, CircularProgress, Typography} from '@mui/material';
import {useId, useInsertionEffect, useMemo} from 'react';

interface Props {
  workoutSummaries?: Array<{
    workoutId: number;
    workoutName: string;
    completedSets: number;
    plannedSets: number;
    muscleDoneSets: Array<{
      muscle: string;
      doneSets: number;
    }>;
  }>;
  onWorkoutsClick?: () => void;
}

function getBlueShade(doneSets: number): string {
  if (doneSets >= 7) return '#1e3a8a';
  if (doneSets >= 5) return '#1d4ed8';
  if (doneSets >= 3) return '#3b82f6';
  if (doneSets >= 1) return '#93c5fd';
  return '';
}

function toPercent(completed: number, planned: number): number {
  if (planned <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((completed / planned) * 100)));
}

export default function WorkoutsSystemCard({
                                             workoutSummaries = [],
                                             onWorkoutsClick,
                                           }: Props) {
  const modelId = useId().replace(/:/g, '-');
  const totalCompletedSets = useMemo(
    () => workoutSummaries.reduce((sum, workout) => sum + workout.completedSets, 0),
    [workoutSummaries],
  );
  const totalPlannedSets = useMemo(
    () => workoutSummaries.reduce((sum, workout) => sum + workout.plannedSets, 0),
    [workoutSummaries],
  );
  const muscleDoneCounts = useMemo(() => {
    const totals = new Map<string, number>();
    for (const workout of workoutSummaries) {
      for (const item of workout.muscleDoneSets) {
        totals.set(item.muscle, (totals.get(item.muscle) ?? 0) + item.doneSets);
      }
    }
    return Array.from(totals.entries()).filter(([, doneSets]) => doneSets > 0);
  }, [workoutSummaries]);

  const muscleCss = useMemo(() => muscleDoneCounts
    .map(([muscle, doneSets]) => {
      const shade = getBlueShade(doneSets);
      return shade ? `#${modelId} [data-muscle="${muscle}"] { fill: ${shade} !important; }` : '';
    })
    .filter(Boolean)
    .join('\n'), [modelId, muscleDoneCounts]);

  useInsertionEffect(() => {
    if (!muscleCss) return;
    const el = document.createElement('style');
    el.textContent = muscleCss;
    document.head.appendChild(el);
    return () => {
      document.head.removeChild(el);
    };
  }, [muscleCss]);

  return (
    <Box
      onClick={onWorkoutsClick}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: 1.25,
        py: {xs: 1.25, sm: 1.5},
        borderRadius: 2,
        cursor: onWorkoutsClick ? 'pointer' : 'default',
        ...(onWorkoutsClick && { '&:hover': { bgcolor: 'action.selected' } }),
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 0.5,
        }}
      >
        <Typography variant="subtitle2" sx={{color: 'text.primary'}}>Training</Typography>
        <Box sx={{display: 'flex', alignItems: 'center', gap: 0.5}}>
          {onWorkoutsClick && <ChevronRightIcon sx={{fontSize: 16, color: 'text.disabled'}}/>}
        </Box>
      </Box>
      {workoutSummaries.length > 0 && (
        <Box
          sx={{
            display: 'flex',
            gap: 1,
            alignItems: 'stretch',
            flexDirection: {xs: 'column', sm: 'row'},
            px: 1
          }}
        >
          <Box
            sx={{
              flex: {xs: '1 1 auto', sm: '1.45 1 0'},
              borderRadius: 1.5,
              border: '1px solid',
              borderColor: 'divider',
              bgcolor: 'background.paper',
              p: {xs: 1, sm: 1.25},
            }}
          >
            <Typography variant="caption" sx={{mb: 1}}>Muscle Map</Typography>
            {muscleDoneCounts.length > 0 ? (
              <Box
                id={modelId}
                sx={{
                  minHeight: 180,
                  maxHeight: 320,
                  display: 'flex',
                  justifyContent: 'center',
                  gap: 0.5,
                }}
              >
                <FrontBody/>
                <BackBody/>
              </Box>
            ) : (
              <Box sx={{minHeight: 180, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                <Typography variant="body2" color="text.secondary">No completed sets yet</Typography>
              </Box>
            )}
          </Box>
          <Box
            sx={{
              flex: {xs: '1 1 auto', sm: '1 1 0'},
              display: 'flex',
              flexDirection: 'column',
              gap: 0.75,
              minWidth: 0,
              borderRadius: 1.5,
              border: '1px solid',
              borderColor: 'divider',
              bgcolor: 'background.paper',
              p: {xs: 1, sm: 1.25},
            }}
          >
            <Box sx={{display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', mb: 0.25}}>
              <Typography variant="caption">Workouts</Typography>
              <Typography variant="body2" color="text.secondary">{totalCompletedSets}/{totalPlannedSets} sets</Typography>
              <Typography variant="body2" color="text.secondary">{workoutSummaries.length} sessions</Typography>
            </Box>
            {workoutSummaries.map(workout => (
              <Box
                key={workout.workoutId}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 1,
                  px: 1.1,
                  py: 0.95,
                  borderRadius: 1.25,
                  border: '1px solid',
                  borderColor: 'divider',
                  bgcolor: 'background.default',
                }}
              >
                <Box sx={{minWidth: 0, flex: 1}}>
                  <Typography variant="body2" sx={{
                    minWidth: 0,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {workout.workoutName}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {workout.completedSets} of {workout.plannedSets} sets
                  </Typography>
                </Box>
                <Box sx={{display: 'flex', alignItems: 'center', gap: 1}}>
                  <Box sx={{position: 'relative', width: 48, height: 48}}>
                    <CircularProgress
                      variant="determinate"
                      value={100}
                      size={48}
                      thickness={6}
                      sx={{color: 'action.disabledBackground', position: 'absolute', left: 0, top: 0}}
                    />
                    <CircularProgress
                      variant="determinate"
                      value={toPercent(workout.completedSets, workout.plannedSets)}
                      size={48}
                      thickness={6}
                      sx={{color: 'primary.main', position: 'absolute', left: 0, top: 0}}
                    />
                    <Box sx={{
                      position: 'absolute',
                      inset: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <Typography variant="caption" color="text.secondary">
                        {toPercent(workout.completedSets, workout.plannedSets)}%
                      </Typography>
                    </Box>
                  </Box>
                  <ChevronRightIcon sx={{color: 'text.disabled'}}/>
                </Box>
              </Box>
            ))}
          </Box>
        </Box>
      )}
    </Box>
  );
}
