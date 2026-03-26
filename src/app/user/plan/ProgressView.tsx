'use client';

import React, { useState } from 'react';
import { Box, Chip, Typography } from '@mui/material';
import { PlanPrisma } from '@/types/dataTypes';

interface ProgressViewProps {
  plan: PlanPrisma;
}

const ProgressView = ({ plan }: ProgressViewProps) => {
  // Determine all distinct workout slots by order position
  const maxWorkoutCount = Math.max(0, ...plan.weeks.map(w => w.workouts.length));
  const [selectedSlot, setSelectedSlot] = useState(1);

  if (maxWorkoutCount === 0) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
        No workouts in this plan yet.
      </Typography>
    );
  }

  // Build slot labels from the first week that has a workout at each position
  const slotLabels: string[] = Array.from({ length: maxWorkoutCount }, (_, i) => {
    for (const week of plan.weeks) {
      const w = week.workouts.find(wk => wk.order === i + 1);
      if (w?.name) return w.name;
    }
    return `Workout ${i + 1}`;
  });

  // For the selected slot, collect the workout from each week
  const workoutsByWeek = plan.weeks.map(week => ({
    week,
    workout: week.workouts.find(w => w.order === selectedSlot) ?? null,
  }));

  // Collect all exercise slots (by order) across all weeks for this workout slot
  const maxExerciseCount = Math.max(
    0,
    ...workoutsByWeek.map(({ workout }) => workout?.exercises.length ?? 0),
  );

  return (
    <Box>
      {/* Workout selector */}
      <Box sx={{ display: 'flex', gap: 0.75, overflowX: 'auto', pb: 1, mb: 2.5, borderBottom: 1, borderColor: 'divider' }}>
        {slotLabels.map((label, i) => (
          <Chip
            key={i}
            label={label}
            onClick={() => setSelectedSlot(i + 1)}
            variant={selectedSlot === i + 1 ? 'filled' : 'outlined'}
            color={selectedSlot === i + 1 ? 'primary' : 'default'}
            size="small"
            sx={{ flexShrink: 0, cursor: 'pointer' }}
          />
        ))}
      </Box>

      {maxExerciseCount === 0 && (
        <Typography variant="body2" color="text.secondary">
          No exercises found for this workout.
        </Typography>
      )}

      {/* One block per exercise slot */}
      {Array.from({ length: maxExerciseCount }, (_, exIdx) => {
        // Canonical name: first week that has an exercise at this position
        let exerciseName = `Exercise ${exIdx + 1}`;
        for (const { workout } of workoutsByWeek) {
          const ex = workout?.exercises.find(e => e.order === exIdx + 1);
          if (ex?.exercise?.name) {
            exerciseName = ex.exercise.name;
            break;
          }
        }

        // Max set count across all weeks for this exercise slot
        const maxSetCount = Math.max(
          0,
          ...workoutsByWeek.map(({ workout }) => {
            const ex = workout?.exercises.find(e => e.order === exIdx + 1);
            return ex ? ex.sets.filter(s => !s.isDropSet).length : 0;
          }),
        );

        if (maxSetCount === 0) return null;

        return (
          <Box key={exIdx} sx={{ mb: 3 }}>
            <Typography variant="body2" fontWeight={600} sx={{ mb: 0.75 }}>
              {exerciseName}
            </Typography>

            <Box sx={{ overflowX: 'auto' }}>
              <table style={{ borderCollapse: 'collapse', width: '100%' }}>
                <thead>
                  <tr>
                    {/* Empty cell for the set label column */}
                    <th style={{ width: '2.5em' }} />
                    {plan.weeks.map(week => (
                      <th
                        key={week.id}
                        style={{
                          fontSize: '0.7rem',
                          padding: '2px 8px',
                          whiteSpace: 'nowrap',
                          color: 'var(--mui-palette-text-secondary, #666)',
                          fontWeight: 600,
                          textAlign: 'center',
                        }}
                      >
                        Wk {week.order}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: maxSetCount }, (_, setIdx) => (
                    <tr key={setIdx}>
                      <td
                        style={{
                          fontSize: '0.68rem',
                          color: 'var(--mui-palette-text-secondary, #888)',
                          padding: '3px 4px 3px 0',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        S{setIdx + 1}
                      </td>
                      {workoutsByWeek.map(({ week, workout }) => {
                        const ex = workout?.exercises.find(e => e.order === exIdx + 1);
                        const regularSets = ex
                          ? ex.sets.filter(s => !s.isDropSet).sort((a, b) => a.order - b.order)
                          : [];
                        const set = regularSets[setIdx];
                        const cellText =
                          set?.weight != null && set?.reps != null
                            ? `${set.weight}×${set.reps}`
                            : set?.weight != null
                            ? `${set.weight}kg`
                            : set?.reps != null
                            ? `×${set.reps}`
                            : '—';
                        const isEmpty = set?.weight == null && set?.reps == null;
                        return (
                          <td
                            key={week.id}
                            style={{
                              fontSize: '0.8rem',
                              padding: '3px 8px',
                              textAlign: 'center',
                              whiteSpace: 'nowrap',
                              color: isEmpty
                                ? 'var(--mui-palette-text-disabled, #bbb)'
                                : 'inherit',
                            }}
                          >
                            {cellText}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </Box>
          </Box>
        );
      })}
    </Box>
  );
};

export default ProgressView;
