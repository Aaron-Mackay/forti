'use client';

import React from 'react';
import { Box, Typography } from '@mui/material';
import { PlanPrisma } from '@/types/dataTypes';
import { useWorkoutEditorContext } from '@/context/WorkoutEditorContext';
import { computeE1rm } from '@lib/e1rm';

/** Strips trailing parenthetical from workout names */
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

const cellSx: React.CSSProperties = {
  padding: '4px 6px',
  fontSize: '0.75rem',
  borderBottom: '1px solid var(--mui-palette-divider, #e0e0e0)',
  whiteSpace: 'nowrap',
  verticalAlign: 'middle',
};

const headerCellSx: React.CSSProperties = {
  padding: '4px 6px',
  fontSize: '0.68rem',
  fontWeight: 600,
  color: 'var(--mui-palette-text-secondary, #666)',
  whiteSpace: 'nowrap',
  borderBottom: '2px solid var(--mui-palette-divider, #e0e0e0)',
  textAlign: 'center',
  backgroundColor: 'var(--mui-palette-background-paper, #fff)',
};

const HIGHLIGHT = 'rgba(255,193,7,0.2)';

interface PlanSheetViewProps {
  plan: PlanPrisma;
  planId: number;
}

const PlanSheetView = ({ plan, planId }: PlanSheetViewProps) => {
  const { dispatch } = useWorkoutEditorContext();

  const sortedWeeks = [...plan.weeks].sort((a, b) => a.order - b.order);
  const maxWorkoutCount = Math.max(0, ...sortedWeeks.map(w => w.workouts.length));

  if (maxWorkoutCount === 0) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
        No workouts yet.
      </Typography>
    );
  }

  // Compute max top-level sets per workout slot across all weeks (resistance only)
  const slotMaxSets: number[] = Array.from({ length: maxWorkoutCount }, (_, slotIdx) => {
    let max = 0;
    for (const week of sortedWeeks) {
      const workout = week.workouts.find(w => w.order === slotIdx + 1);
      if (!workout) continue;
      for (const ex of workout.exercises) {
        if (ex.exercise?.category === 'cardio') continue;
        const topLevel = ex.sets.filter(s => !s.isDropSet).length;
        if (topLevel > max) max = topLevel;
      }
    }
    return max;
  });

  return (
    <Box
      sx={{
        overflowX: 'auto',
        overflowY: 'visible',
        touchAction: 'pan-x pan-y',
      }}
    >
      {/* min-width container so week label always spans full workout row */}
      <Box sx={{ width: 'max-content', minWidth: '100%' }}>
        {sortedWeeks.map((week) => {
          const sortedWorkouts = [...week.workouts].sort((a, b) => a.order - b.order);

          return (
            <Box key={week.id} sx={{ mb: 3 }}>
              {/* Week label */}
              <Typography
                variant="overline"
                sx={{
                  display: 'block',
                  fontWeight: 700,
                  fontSize: '0.7rem',
                  letterSpacing: '0.08em',
                  color: 'text.secondary',
                  pb: 0.5,
                  mb: 0.5,
                  borderBottom: '2px solid',
                  borderColor: 'divider',
                  width: '100%',
                }}
              >
                Week {week.order}
              </Typography>

              {/* Workout slot columns */}
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                {Array.from({ length: maxWorkoutCount }, (_, slotIdx) => {
                  const workout = sortedWorkouts.find(w => w.order === slotIdx + 1) ?? null;
                  const maxSets = slotMaxSets[slotIdx];

                  if (!workout) {
                    return (
                      <Box key={slotIdx} sx={{ minWidth: '200px' }} />
                    );
                  }

                  const sortedExercises = [...workout.exercises].sort((a, b) => a.order - b.order);
                  const resistanceExercises = sortedExercises.filter(ex => ex.exercise?.category !== 'cardio');
                  const cardioExercises = sortedExercises.filter(ex => ex.exercise?.category === 'cardio');

                  return (
                    <Box key={slotIdx} sx={{ flexShrink: 0 }}>
                      {/* Workout name */}
                      <Typography
                        variant="caption"
                        sx={{
                          display: 'block',
                          fontWeight: 700,
                          fontSize: '0.72rem',
                          mb: 0.5,
                          color: 'text.primary',
                        }}
                      >
                        {stripSuffix(workout.name ?? `Workout ${slotIdx + 1}`)}
                      </Typography>

                      {/* Resistance table */}
                      {(resistanceExercises.length > 0 || cardioExercises.length === 0) && (
                        <table style={{ borderCollapse: 'collapse' }}>
                          <thead>
                            <tr>
                              <th style={{ ...headerCellSx, textAlign: 'left', minWidth: '9rem', maxWidth: '14rem' }}>
                                Exercise
                              </th>
                              <th style={{ ...headerCellSx, minWidth: '3rem' }}>TGT</th>
                              <th style={{ ...headerCellSx, minWidth: '3rem' }}>REST</th>
                              {Array.from({ length: maxSets }, (_, si) => (
                                <React.Fragment key={si}>
                                  <th style={{ ...headerCellSx }}>Weight</th>
                                  <th style={{ ...headerCellSx }}>Reps</th>
                                </React.Fragment>
                              ))}
                              <th style={{ ...headerCellSx, minWidth: '3.5rem' }}>~e1RM</th>
                            </tr>
                          </thead>
                          <tbody>
                            {resistanceExercises.length === 0 ? (
                              <tr>
                                <td colSpan={4 + maxSets * 2} style={{ ...cellSx, color: 'var(--mui-palette-text-disabled, #bbb)', fontStyle: 'italic' }}>
                                  No exercises
                                </td>
                              </tr>
                            ) : (
                              resistanceExercises.map((ex) => {
                                const topLevelSets = ex.sets
                                  .filter(s => !s.isDropSet)
                                  .sort((a, b) => a.order - b.order);
                                const dropSets = ex.sets
                                  .filter(s => s.isDropSet)
                                  .sort((a, b) => a.order - b.order);

                                // Group drop sets by parentSetId
                                const dropsByParent = new Map<number, typeof dropSets>();
                                for (const ds of dropSets) {
                                  if (ds.parentSetId == null) continue;
                                  if (!dropsByParent.has(ds.parentSetId)) {
                                    dropsByParent.set(ds.parentSetId, []);
                                  }
                                  dropsByParent.get(ds.parentSetId)!.push(ds);
                                }

                                // Find best e1RM across all sets
                                let bestE1rm: number | null = null;
                                let bestSetId: number | null = null;
                                for (const s of ex.sets) {
                                  const v = computeE1rm(s.weight, s.reps);
                                  if (v != null && (bestE1rm == null || v > bestE1rm)) {
                                    bestE1rm = v;
                                    bestSetId = s.id;
                                  }
                                }

                                return (
                                  <React.Fragment key={ex.id}>
                                    {/* Main exercise row */}
                                    <tr>
                                      <td style={{ ...cellSx, textAlign: 'left', maxWidth: '14rem', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        <span style={{ fontWeight: 600, fontSize: '0.75rem' }}>
                                          {ex.exercise?.name ?? '(unnamed)'}
                                        </span>
                                      </td>
                                      <td style={{ ...cellSx, textAlign: 'center', color: 'var(--mui-palette-text-secondary, #666)' }}>
                                        {ex.repRange ?? '—'}
                                      </td>
                                      <td style={{ ...cellSx, textAlign: 'center', color: 'var(--mui-palette-text-secondary, #666)' }}>
                                        {ex.restTime ?? '—'}
                                      </td>
                                      {Array.from({ length: maxSets }, (_, si) => {
                                        const set = topLevelSets[si];
                                        if (!set) {
                                          return (
                                            <React.Fragment key={si}>
                                              <td style={{ ...cellSx, textAlign: 'center', color: 'var(--mui-palette-text-disabled, #bbb)' }}>—</td>
                                              <td style={{ ...cellSx, textAlign: 'center', color: 'var(--mui-palette-text-disabled, #bbb)' }}>—</td>
                                            </React.Fragment>
                                          );
                                        }
                                        const isHighlighted = set.id === bestSetId;
                                        const highlightStyle = isHighlighted ? { background: HIGHLIGHT } : {};
                                        return (
                                          <React.Fragment key={si}>
                                            <td style={{ ...cellSx, textAlign: 'center', ...highlightStyle }}>
                                              <input
                                                type="number"
                                                value={set.weight ?? ''}
                                                onChange={(e) => {
                                                  const v = e.target.value === '' ? null : parseFloat(e.target.value);
                                                  dispatch({
                                                    type: 'UPDATE_SET_WEIGHT',
                                                    planId,
                                                    weekId: week.id,
                                                    workoutId: workout.id,
                                                    exerciseId: ex.id,
                                                    setId: set.id,
                                                    weight: isNaN(v as number) ? null : v,
                                                  });
                                                }}
                                                placeholder="kg"
                                                style={inputSx}
                                              />
                                            </td>
                                            <td style={{ ...cellSx, textAlign: 'center', ...highlightStyle }}>
                                              <input
                                                type="number"
                                                value={set.reps ?? ''}
                                                onChange={(e) => {
                                                  const v = parseInt(e.target.value, 10);
                                                  if (!isNaN(v)) {
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
                                            </td>
                                          </React.Fragment>
                                        );
                                      })}
                                      <td style={{ ...cellSx, textAlign: 'right', color: 'var(--mui-palette-text-disabled, #bbb)', fontSize: '0.68rem' }}>
                                        {bestE1rm != null ? `~${Math.round(bestE1rm)}` : '—'}
                                      </td>
                                    </tr>

                                    {/* Drop set rows */}
                                    {topLevelSets.map((parentSet, _si) => {
                                      const children = dropsByParent.get(parentSet.id) ?? [];
                                      return children.map((dropSet, di) => {
                                        const isHighlighted = dropSet.id === bestSetId;
                                        const highlightStyle = isHighlighted ? { background: HIGHLIGHT } : {};
                                        return (
                                          <tr key={dropSet.id}>
                                            <td style={{ ...cellSx, textAlign: 'left', paddingLeft: '1.5rem', color: 'var(--mui-palette-text-secondary, #666)', fontSize: '0.7rem' }}>
                                              ↓ Drop {di + 1}
                                            </td>
                                            <td style={{ ...cellSx }} />
                                            <td style={{ ...cellSx }} />
                                            {Array.from({ length: maxSets }, (_, colIdx) => {
                                              if (colIdx !== 0) {
                                                return (
                                                  <React.Fragment key={colIdx}>
                                                    <td style={{ ...cellSx, textAlign: 'center', color: 'var(--mui-palette-text-disabled, #bbb)' }}>—</td>
                                                    <td style={{ ...cellSx, textAlign: 'center', color: 'var(--mui-palette-text-disabled, #bbb)' }}>—</td>
                                                  </React.Fragment>
                                                );
                                              }
                                              return (
                                                <React.Fragment key={colIdx}>
                                                  <td style={{ ...cellSx, textAlign: 'center', ...highlightStyle }}>
                                                    <input
                                                      type="number"
                                                      value={dropSet.weight ?? ''}
                                                      onChange={(e) => {
                                                        const v = e.target.value === '' ? null : parseFloat(e.target.value);
                                                        dispatch({
                                                          type: 'UPDATE_SET_WEIGHT',
                                                          planId,
                                                          weekId: week.id,
                                                          workoutId: workout.id,
                                                          exerciseId: ex.id,
                                                          setId: dropSet.id,
                                                          weight: isNaN(v as number) ? null : v,
                                                        });
                                                      }}
                                                      placeholder="kg"
                                                      style={inputSx}
                                                    />
                                                  </td>
                                                  <td style={{ ...cellSx, textAlign: 'center', ...highlightStyle }}>
                                                    <input
                                                      type="number"
                                                      value={dropSet.reps ?? ''}
                                                      onChange={(e) => {
                                                        const v = parseInt(e.target.value, 10);
                                                        if (!isNaN(v)) {
                                                          dispatch({
                                                            type: 'UPDATE_SET_REPS',
                                                            planId,
                                                            weekId: week.id,
                                                            workoutId: workout.id,
                                                            exerciseId: ex.id,
                                                            setId: dropSet.id,
                                                            reps: v,
                                                          });
                                                        }
                                                      }}
                                                      placeholder="reps"
                                                      style={inputSx}
                                                    />
                                                  </td>
                                                </React.Fragment>
                                              );
                                            })}
                                            <td style={{ ...cellSx }} />
                                          </tr>
                                        );
                                      });
                                    })}
                                  </React.Fragment>
                                );
                              })
                            )}
                          </tbody>
                        </table>
                      )}

                      {/* Cardio sub-table */}
                      {cardioExercises.length > 0 && (
                        <Box sx={{ mt: resistanceExercises.length > 0 ? 1 : 0 }}>
                          <table style={{ borderCollapse: 'collapse' }}>
                            <thead>
                              <tr>
                                <th style={{ ...headerCellSx, textAlign: 'left', minWidth: '9rem', maxWidth: '14rem' }}>
                                  Cardio
                                </th>
                                <th style={{ ...headerCellSx, minWidth: '3.5rem' }}>Min</th>
                                <th style={{ ...headerCellSx, minWidth: '3.5rem' }}>km</th>
                                <th style={{ ...headerCellSx, minWidth: '4rem' }}>Resistance</th>
                              </tr>
                            </thead>
                            <tbody>
                              {cardioExercises.map((ex) => (
                                <tr key={ex.id}>
                                  <td style={{ ...cellSx, textAlign: 'left', maxWidth: '14rem', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    <span style={{ fontWeight: 600, fontSize: '0.75rem' }}>
                                      {ex.exercise?.name ?? '(unnamed)'}
                                    </span>
                                  </td>
                                  {(['cardioDuration', 'cardioDistance', 'cardioResistance'] as const).map((field) => (
                                    <td key={field} style={{ ...cellSx, textAlign: 'center' }}>
                                      <input
                                        type="number"
                                        value={ex[field] ?? ''}
                                        onChange={(e) => {
                                          const v = e.target.value === '' ? null : parseFloat(e.target.value);
                                          dispatch({
                                            type: 'UPDATE_CARDIO_DATA',
                                            planId,
                                            weekId: week.id,
                                            workoutId: workout.id,
                                            exerciseId: ex.id,
                                            field,
                                            value: isNaN(v as number) ? null : v,
                                          });
                                        }}
                                        placeholder="—"
                                        style={{ ...inputSx, width: '4em' }}
                                      />
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </Box>
                      )}
                    </Box>
                  );
                })}
              </Box>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
};

export default PlanSheetView;
