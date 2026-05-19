'use client';

import { Box, Button, Container, List, ListItem, ListItemButton, ListItemText, Typography } from '@mui/material';
import { WeekPrisma } from '@/types/dataTypes';
import { useAppBar } from '@lib/providers/AppBarProvider';
import ProgressIcon from '@/lib/ProgressIcon';
import { getWorkoutStatus } from '@/lib/workoutProgress';
import WeekMuscleSummary from './WeekMuscleSummary';
import { HEIGHT_EXC_APPBAR } from '@/components/shell/CustomAppBar';
import { signalTokens } from '@lib/signal/tokens';

const gymPalette = signalTokens.surface.gym;

export default function WorkoutsListView({
  week,
  onBack,
  onSelectWorkout,
  onCompleteWeek,
  signalEnabled = false,
}: {
  week: WeekPrisma;
  onBack: () => void;
  onSelectWorkout: (workoutId: number) => void;
  onCompleteWeek?: () => void;
  signalEnabled?: boolean;
}) {
  useAppBar({ title: `Week ${week.order}`, showBack: true, onBack });

  if (signalEnabled) {
    return (
      <div style={{ minHeight: '100dvh', background: gymPalette.bg, color: gymPalette.ink, fontFamily: signalTokens.fontVar.body, padding: '14px 16px 28px' }}>
        <div style={{ fontFamily: signalTokens.fontVar.mono, fontSize: 11, color: gymPalette.inkLight, marginBottom: 6 }}>
          Week {week.order}
        </div>
        <div style={{ fontFamily: signalTokens.fontVar.cond, fontSize: 26, fontWeight: 700, letterSpacing: '-0.015em', lineHeight: 1, marginBottom: 18 }}>
          Select a workout
        </div>
        {onCompleteWeek && (
          <button
            type="button"
            onClick={onCompleteWeek}
            style={{
              width: '100%',
              border: `1px solid ${gymPalette.borderStrong}`,
              borderRadius: signalTokens.radii.card,
              background: gymPalette.surface,
              color: gymPalette.ink,
              padding: '12px 14px',
              textAlign: 'left',
              marginBottom: 12,
              cursor: 'pointer',
            }}
          >
            <span style={{ display: 'block', fontFamily: signalTokens.fontVar.mono, fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', marginBottom: 3 }}>
              COMPLETE WEEK
            </span>
            <span style={{ color: gymPalette.inkMid, fontSize: 13 }}>Mark unfinished workouts as complete</span>
          </button>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {week.workouts.map((workout) => {
            const setCount = workout.exercises.reduce((sum, ex) => sum + ex.sets.length, 0);
            const status = getWorkoutStatus(workout);
            const done = status === 'completed';
            return (
              <button
                key={workout.id}
                type="button"
                onClick={() => onSelectWorkout(workout.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  width: '100%',
                  background: gymPalette.surface,
                  border: `1px solid ${gymPalette.border}`,
                  borderRadius: signalTokens.radii.card,
                  padding: '14px 16px',
                  color: gymPalette.ink,
                  cursor: 'pointer',
                  textAlign: 'left',
                  gap: 12,
                }}
              >
                <span style={{ fontFamily: signalTokens.fontVar.body, fontSize: 15, fontWeight: 500, flex: 1, minWidth: 0 }}>
                  {workout.name}
                </span>
                <span style={{ fontFamily: signalTokens.fontVar.mono, fontSize: 11, color: done ? signalTokens.signal.deep : gymPalette.inkLight, flexShrink: 0 }}>
                  {done ? 'done' : `${setCount} sets`}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <Box sx={{ maxHeight: HEIGHT_EXC_APPBAR, bgcolor: 'background.default', color: 'text.primary' }}>
      <Container sx={{ pt: 1 }}>
        <WeekMuscleSummary week={week} />
        <Typography variant="subtitle1" gutterBottom>
          Workouts
        </Typography>
        {onCompleteWeek && (
          <Button variant="outlined" size="small" onClick={onCompleteWeek} sx={{ mb: 1 }}>
            Complete week
          </Button>
        )}
        <List>
          {week.workouts.map((workout) => {
            const setCount = workout.exercises.reduce((sum, ex) => sum + ex.sets.length, 0);
            return (
              <ListItem key={workout.id} disablePadding secondaryAction={
                <ProgressIcon status={getWorkoutStatus(workout)} />
              }>
                <ListItemButton onClick={() => onSelectWorkout(workout.id)}>
                  <Box>
                    <ListItemText primary={workout.name} sx={{m: 0}} />
                    <Typography variant="caption" color="text.secondary">
                      {setCount} sets
                    </Typography>
                  </Box>
                </ListItemButton>
              </ListItem>
            );
          })}
        </List>
      </Container>
    </Box>
  );
}
