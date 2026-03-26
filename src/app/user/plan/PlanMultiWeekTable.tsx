'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Box, Chip, TextField, Typography } from '@mui/material';
import { PlanPrisma } from '@/types/dataTypes';
import { useWorkoutEditorContext } from '@/context/WorkoutEditorContext';
import { getWeekStatus } from '@/lib/workoutProgress';
import ExercisePickerDialog from '@/app/user/workout/ExercisePickerDialog';
import { computeE1rm } from '@/lib/e1rm';

/** Strips trailing parenthetical from workout names, e.g. "Workout 1 (Plan 1 - Week 2)" → "Workout 1" */
function stripSuffix(name: string): string {
  return name.replace(/\s*\([^)]*\)\s*$/, '').trim();
}

const inputSx: React.CSSProperties = {
  width: '3.2em',
  textAlign: 'center',
  border: '1px solid rgba(0,0,0,0.23)',
  borderRadius: '4px',
  padding: '2px 3px',
  fontSize: '0.75rem',
  fontFamily: 'inherit',
  background: 'transparent',
  color: 'inherit',
  outline: 'none',
  MozAppearance: 'textfield',
};

interface PlanMultiWeekTableProps {
  plan: PlanPrisma;
  planId: number;
}

const PlanMultiWeekTable = ({ plan, planId }: PlanMultiWeekTableProps) => {
  const { dispatch, debouncedDispatch } = useWorkoutEditorContext();
  const [pickerOpen, setPickerOpen] = useState(false);
  const sortedWeeks = [...plan.weeks].sort((a, b) => a.order - b.order);

  const maxWorkoutCount = Math.max(0, ...plan.weeks.map(w => w.workouts.length));
  const [selectedWorkoutOrder, setSelectedWorkoutOrder] = useState(1);

  // Find the id of the latest week that has any weight/reps entered
  const scrollTargetWeekId = (() => {
    let lastId: number | null = null;
    for (const week of sortedWeeks) {
      const hasData = week.workouts.some(wo =>
        wo.exercises.some(ex =>
          ex.sets.some(s => s.weight != null || (s.reps != null && s.reps > 0))
        )
      );
      if (hasData) lastId = week.id;
    }
    return lastId ?? sortedWeeks[sortedWeeks.length - 1]?.id ?? null;
  })();

  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = scrollRef.current?.querySelector('[data-scroll-target="true"]');
    if (el) el.scrollIntoView({ behavior: 'instant', block: 'nearest', inline: 'center' });
  }, []); // on mount only

  if (maxWorkoutCount === 0) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
        No workouts yet.
      </Typography>
    );
  }

  // Build slot labels from first week that has a workout at each position
  const slotLabels: string[] = Array.from({ length: maxWorkoutCount }, (_, i) => {
    for (const week of plan.weeks) {
      const w = week.workouts.find(wk => wk.order === i + 1);
      if (w?.name) return stripSuffix(w.name);
    }
    return `Workout ${i + 1}`;
  });

  // For each week, find the workout at the selected order slot
  const workoutsByWeek = sortedWeeks.map(week => ({
    week,
    workout: week.workouts.find(w => w.order === selectedWorkoutOrder) ?? null,
  }));

  // First non-completed week is "active" (current); past = completed
  const activeWeekIdx = sortedWeeks.findIndex(w => getWeekStatus(w) !== 'completed');
  const activeWeekOrder = activeWeekIdx >= 0
    ? sortedWeeks[activeWeekIdx].order
    : sortedWeeks[sortedWeeks.length - 1]?.order ?? 1;

  // Collect all unique exercises across all weeks for this workout slot (by exercise.id)
  // Order preserves first occurrence across weeks in order
  const exerciseMap = new Map<
    number,
    { exerciseId: number; name: string; repRange: string | null; restTime: string | null; targetRpe: number | null; targetRir: number | null }
  >();
  for (const { workout } of workoutsByWeek) {
    if (!workout) continue;
    const sorted = [...workout.exercises].sort((a, b) => a.order - b.order);
    for (const ex of sorted) {
      const eid = ex.exercise?.id;
      if (eid != null && !exerciseMap.has(eid)) {
        exerciseMap.set(eid, {
          exerciseId: eid,
          name: ex.exercise?.name ?? '(unnamed)',
          repRange: ex.repRange,
          restTime: ex.restTime,
          targetRpe: ex.targetRpe,
          targetRir: ex.targetRir,
        });
      }
    }
  }
  const exerciseList = Array.from(exerciseMap.values());

  // Active workout (for + Exercise action)
  const activeWorkout = workoutsByWeek.find(x => x.week.order === activeWeekOrder)?.workout ?? null;

  return (
    <Box>
      {/* Workout chips + add */}
      <Box sx={{ display: 'flex', gap: 0.75, overflowX: 'auto', pb: 1, mb: 1, alignItems: 'center' }}>
        {slotLabels.map((label, i) => (
          <Chip
            key={i}
            label={label}
            onClick={() => setSelectedWorkoutOrder(i + 1)}
            variant={selectedWorkoutOrder === i + 1 ? 'filled' : 'outlined'}
            color={selectedWorkoutOrder === i + 1 ? 'primary' : 'default'}
            size="small"
            sx={{ flexShrink: 0, cursor: 'pointer' }}
          />
        ))}
        <Chip
          label="+ Workout"
          onClick={() => {
            const newOrder = maxWorkoutCount + 1;
            setSelectedWorkoutOrder(newOrder);
            const activeWeek = sortedWeeks.find(w => w.order === activeWeekOrder);
            if (activeWeek) {
              dispatch({ type: 'ADD_WORKOUT', planId, weekId: activeWeek.id });
            }
          }}
          variant="outlined"
          size="small"
          sx={{ flexShrink: 0, cursor: 'pointer', borderStyle: 'dashed' }}
        />
      </Box>

      {/* Editable workout name */}
      {activeWorkout && (
        <TextField
          size="small"
          label="Workout name"
          value={activeWorkout.name ?? ''}
          onChange={(e) => {
            // Update name for this workout in all weeks that have a workout at this order slot
            workoutsByWeek.forEach(({ week, workout: wo }) => {
              if (wo) {
                debouncedDispatch({
                  type: 'UPDATE_WORKOUT_NAME',
                  planId,
                  weekId: week.id,
                  workoutId: wo.id,
                  name: e.target.value,
                });
              }
            });
          }}
          sx={{ mb: 2, width: '100%', maxWidth: 320 }}
          autoComplete="off"
        />
      )}

      {/* Scrollable table */}
      <Box ref={scrollRef} sx={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', width: '100%' }}>
          <thead>
            <tr>
              <th
                style={{
                  minWidth: '9rem',
                  maxWidth: '14rem',
                  textAlign: 'left',
                  padding: '4px 12px 4px 0',
                  fontSize: '0.72rem',
                  color: 'var(--mui-palette-text-secondary, #666)',
                  fontWeight: 600,
                  verticalAlign: 'bottom',
                }}
              >
                Exercise
              </th>
              {sortedWeeks.map(week => (
                <th
                  key={week.id}
                  data-scroll-target={week.id === scrollTargetWeekId ? 'true' : undefined}
                  style={{
                    padding: '4px 12px',
                    fontSize: '0.72rem',
                    color: 'var(--mui-palette-text-secondary, #666)',
                    fontWeight: 600,
                    textAlign: 'center',
                    whiteSpace: 'nowrap',
                    verticalAlign: 'bottom',
                  }}
                >
                  Wk {week.order}
                  {week.order === activeWeekOrder && (
                    <span style={{ fontSize: '0.65rem', marginLeft: '0.25em', opacity: 0.7 }}>(now)</span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {exerciseList.map(({ exerciseId, name, repRange, restTime, targetRpe, targetRir }) => {
              // Find this exercise's WorkoutExercise entry per week
              const exByWeek = workoutsByWeek.map(({ week, workout }) => ({
                week,
                workout,
                ex: workout?.exercises.find(e => e.exercise?.id === exerciseId) ?? null,
              }));

              const maxSets = Math.max(
                0,
                ...exByWeek.map(({ ex }) =>
                  ex ? ex.sets.filter(s => !s.isDropSet).length : 0,
                ),
              );

              if (maxSets === 0) return null;

              const metaParts = [
                repRange && `${repRange} reps`,
                restTime,
                targetRpe != null && `RPE ${targetRpe}`,
                targetRir != null && `${targetRir} RIR`,
              ].filter(Boolean);

              return (
                <tr key={exerciseId} style={{ borderTop: '1px solid var(--mui-palette-divider, #e0e0e0)' }}>
                  {/* Exercise name + meta */}
                  <td style={{ padding: '8px 12px 8px 0', verticalAlign: 'top' }}>
                    <Typography variant="body2" fontWeight={600} sx={{ lineHeight: 1.3 }}>
                      {name}
                    </Typography>
                    {metaParts.length > 0 && (
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.68rem' }}>
                        {metaParts.join(' · ')}
                      </Typography>
                    )}
                  </td>

                  {/* One cell per week */}
                  {exByWeek.map(({ week, workout, ex }) => {
                    const regularSets = ex
                      ? ex.sets.filter(s => !s.isDropSet).sort((a, b) => a.order - b.order)
                      : [];

                    return (
                      <td key={week.id} style={{ padding: '8px 12px', verticalAlign: 'top', textAlign: 'center' }}>
                        {regularSets.length === 0 && (
                          <Typography variant="caption" color="text.disabled">
                            —
                          </Typography>
                        )}

                        {regularSets.map((set, si) => {
                          const e1rm = computeE1rm(set.weight, set.reps);
                          return (
                          <Box
                            key={set.id}
                            sx={{ display: 'flex', gap: 0.25, alignItems: 'center', justifyContent: 'center', mb: 0.25 }}
                          >
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem', minWidth: '1em' }}>
                              S{si + 1}
                            </Typography>
                            <input
                              type="number"
                              value={set.weight ?? ''}
                              onChange={(e) => {
                                const v = e.target.value === '' ? null : parseFloat(e.target.value);
                                if (ex && workout) {
                                  dispatch({
                                    type: 'UPDATE_SET_WEIGHT',
                                    planId,
                                    weekId: week.id,
                                    workoutId: workout.id,
                                    exerciseId: ex.id,
                                    setId: set.id,
                                    weight: isNaN(v as number) ? null : v,
                                  });
                                }
                              }}
                              placeholder="kg"
                              style={inputSx}
                            />
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                              ×
                            </Typography>
                            <input
                              type="number"
                              value={set.reps ?? ''}
                              onChange={(e) => {
                                const v = parseInt(e.target.value, 10);
                                if (!isNaN(v) && ex && workout) {
                                  dispatch({
                                    type: 'UPDATE_SET_REPS',
                                    planId,
                                    weekId: week.id,
                                    workoutId: workout.id,
                                    exerciseId: ex.id,
                                    setId: set.id,
                                    reps: v,
                                  });
                                }
                              }}
                              placeholder="reps"
                              style={inputSx}
                            />
                            <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.65rem', minWidth: '2.5em', textAlign: 'right' }}>
                              {e1rm != null ? `~${Math.round(e1rm)}` : ''}
                            </Typography>
                          </Box>
                          );
                        })}

                        {/* + Set − */}
                        {ex && workout && (
                          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 0.75, mt: 0.5 }}>
                            <Typography
                              variant="caption"
                              color="primary"
                              sx={{ cursor: 'pointer', fontSize: '0.85rem', lineHeight: 1, userSelect: 'none' }}
                              onClick={() =>
                                dispatch({ type: 'ADD_SET', planId, weekId: week.id, workoutId: workout.id, exerciseId: ex.id })
                              }
                            >
                              +
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                              Set
                            </Typography>
                            <Typography
                              variant="caption"
                              color={regularSets.length > 0 ? 'primary' : 'text.disabled'}
                              sx={{ cursor: regularSets.length > 0 ? 'pointer' : 'default', fontSize: '0.85rem', lineHeight: 1, userSelect: 'none' }}
                              onClick={() => {
                                if (regularSets.length > 0)
                                  dispatch({ type: 'REMOVE_SET', planId, weekId: week.id, workoutId: workout.id, exerciseId: ex.id });
                              }}
                            >
                              −
                            </Typography>
                          </Box>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}

            {/* + Exercise row */}
            <tr style={{ borderTop: '1px solid var(--mui-palette-divider, #e0e0e0)' }}>
              <td colSpan={sortedWeeks.length + 1} style={{ padding: '8px 0' }}>
                {activeWorkout ? (
                  <Typography
                    variant="body2"
                    color="primary"
                    sx={{ cursor: 'pointer' }}
                    onClick={() => setPickerOpen(true)}
                  >
                    + Exercise
                  </Typography>
                ) : (
                  <Typography variant="body2" color="text.disabled">
                    + Exercise
                  </Typography>
                )}
              </td>
            </tr>
          </tbody>
        </table>
      </Box>

      <ExercisePickerDialog
        open={pickerOpen}
        title="Add Exercise"
        onClose={() => setPickerOpen(false)}
        onSelect={(exercise) => {
          setPickerOpen(false);
          const activeWeekEntry = workoutsByWeek.find(x => x.workout?.id === activeWorkout?.id);
          if (activeWeekEntry && activeWorkout) {
            dispatch({
              type: 'ADD_EXERCISE_WITH_SET_FOR_EXERCISE',
              planId,
              weekId: activeWeekEntry.week.id,
              workoutId: activeWorkout.id,
              exercise,
            });
          }
        }}
      />
    </Box>
  );
};

export default PlanMultiWeekTable;
