'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Box, Chip, IconButton, Menu, Stack, TextField, Typography } from '@mui/material';
import { PlanPrisma } from '@/types/dataTypes';
import { useWorkoutEditorContext } from '@/context/WorkoutEditorContext';
import { getWeekStatus } from '@/lib/workoutProgress';
import ExercisePickerDialog from '@/app/user/workout/ExercisePickerDialog';
import { ExerciseMenuActionItem, ExerciseMenuDropAndBfrItems } from './ExerciseMenuItems';
import { getLatestTrackedWeekId, stripWorkoutSuffix } from './planPresentation';
import { buildExerciseMetaParts, CompactSetEditor, EditableExerciseNameWithMeta, SetCountControls } from './PlanExercisePrimitives';
import { confirmRemoveLastSetWithDrops, getExerciseSetModel } from './exerciseSetModel';
import { hasTrailingDropSets, removeExercises, removeTrailingDropSets, setBfrEnabled } from './exerciseMenuActions';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import ExerciseDetailsDialog from './ExerciseDetailsDialog';

interface PlanMultiWeekTableProps {
  plan: PlanPrisma;
  planId: number;
  creationMode?: boolean;
}

const PlanMultiWeekTable = ({ plan, planId, creationMode = false }: PlanMultiWeekTableProps) => {
  const { allExercises, dispatch, debouncedDispatch } = useWorkoutEditorContext();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerMode, setPickerMode] = useState<'add' | 'change'>('add');
  const [exerciseMenu, setExerciseMenu] = useState<null | { anchor: HTMLElement; exerciseId: number }>(null);
  const [changeExerciseId, setChangeExerciseId] = useState<number | null>(null);
  const [detailsExerciseId, setDetailsExerciseId] = useState<number | null>(null);
  const [dropEnabledExerciseIds, setDropEnabledExerciseIds] = useState<Set<number>>(new Set());
  const sortedWeeks = [...plan.weeks].sort((a, b) => a.order - b.order);

  const maxWorkoutCount = Math.max(0, ...plan.weeks.map(w => w.workouts.length));
  const [selectedWorkoutOrder, setSelectedWorkoutOrder] = useState(1);

  // Find the id of the latest week that has any weight/reps entered
  const scrollTargetWeekId = getLatestTrackedWeekId(plan);

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
      if (w?.name) return stripWorkoutSuffix(w.name);
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
    { exerciseId: number; name: string; category: string | null; repRange: string | null; restTime: string | null; targetRpe: number | null; targetRir: number | null }
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
          category: ex.exercise?.category ?? null,
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
  const targetExerciseId = exerciseMenu?.exerciseId ?? changeExerciseId ?? detailsExerciseId;
  const menuRows = targetExerciseId != null
    ? workoutsByWeek
        .map(({ week, workout }) => ({
          week,
          workout,
          ex: workout?.exercises.find((exercise) => exercise.exercise?.id === targetExerciseId) ?? null,
        }))
        .filter(({ ex }) => ex)
    : [];
  const menuExercise = menuRows[0]?.ex ?? null;
  const menuTargets = menuRows.flatMap(({ week, workout, ex }) =>
    workout && ex ? [{ weekId: week.id, workoutId: workout.id, exercise: ex }] : [],
  );
  const menuHasTrailingDrops = menuTargets.some((target) => hasTrailingDropSets(target.exercise));
  const menuDropEnabled = targetExerciseId != null ? (dropEnabledExerciseIds.has(targetExerciseId) || menuHasTrailingDrops) : false;

  return (
    <Box>
      <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap" sx={{ mb: 1.5 }}>
        {sortedWeeks.map((week) => (
          <Chip
            key={week.id}
            label={`Week ${week.order}`}
            onDelete={sortedWeeks.length > 1 ? () => dispatch({ type: 'REMOVE_WEEK', planId, weekId: week.id }) : undefined}
            size="small"
            variant={week.order === activeWeekOrder ? 'filled' : 'outlined'}
            color={week.order === activeWeekOrder ? 'primary' : 'default'}
          />
        ))}
        {!creationMode && (
          <Chip
            icon={<AddIcon />}
            label="Week"
            onClick={() => {
              const lastWeek = sortedWeeks[sortedWeeks.length - 1];
              if (lastWeek) dispatch({ type: 'DUPLICATE_WEEK', planId, weekId: lastWeek.id });
            }}
            variant="outlined"
            size="small"
            sx={{ borderStyle: 'dashed' }}
          />
        )}
      </Stack>

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
            setChangeExerciseId(null);
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
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <TextField
            size="small"
            label="Workout name"
            value={activeWorkout.name ?? ''}
            onChange={(e) => {
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
            sx={{ width: '100%', maxWidth: 320 }}
            autoComplete="off"
          />
          <IconButton
            size="small"
            disabled={maxWorkoutCount <= 1}
            onClick={() => {
              workoutsByWeek.forEach(({ week, workout }) => {
                if (workout) {
                  dispatch({ type: 'REMOVE_WORKOUT', planId, weekId: week.id, workoutId: workout.id });
                }
              });
            }}
            aria-label="Delete workout"
          >
            <DeleteOutlineIcon fontSize="small" />
          </IconButton>
        </Box>
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
            {exerciseList.map(({ exerciseId, name, category, repRange, restTime, targetRpe, targetRir }) => {
              // Find this exercise's WorkoutExercise entry per week
              const exByWeek = workoutsByWeek.map(({ week, workout }) => ({
                week,
                workout,
                ex: workout?.exercises.find(e => e.exercise?.id === exerciseId) ?? null,
              }));
              const isCardio = category === 'cardio';
              const dropControlsEnabled = dropEnabledExerciseIds.has(exerciseId) || exByWeek.some(({ ex }) => {
                if (!ex) return false;
                const regularSets = ex.sets.filter((set) => !set.isDropSet).sort((a, b) => a.order - b.order);
                const lastRegularSet = regularSets[regularSets.length - 1];
                if (!lastRegularSet) return false;
                return ex.sets.some((set) => set.isDropSet && set.parentSetId === lastRegularSet.id);
              });

              const maxSets = Math.max(
                0,
                ...exByWeek.map(({ ex }) =>
                  ex ? ex.sets.filter(s => !s.isDropSet).length : 0,
                ),
              );

              if (!isCardio && maxSets === 0) return null;

              const isBfr = exByWeek.some(({ ex }) => ex?.isBfr)
              const metaParts = buildExerciseMetaParts({ repRange, restTime, targetRpe, targetRir });

              return (
                <tr key={exerciseId} style={{ borderTop: '1px solid var(--mui-palette-divider, #e0e0e0)' }}>
                  {/* Exercise name + meta */}
                  <td style={{ padding: '8px 12px 8px 0', verticalAlign: 'top' }}>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 0.5 }}>
                      <Box sx={{ minWidth: 0 }}>
                        <EditableExerciseNameWithMeta
                          name={name}
                          metaParts={metaParts}
                          isBfr={isBfr}
                          onClick={() => {
                            setChangeExerciseId(exerciseId);
                            setPickerMode('change');
                            setPickerOpen(true);
                          }}
                        />
                      </Box>
                      <IconButton
                        size="small"
                        sx={{ p: 0.25, opacity: 0.6, '&:hover': { opacity: 1 } }}
                        onClick={(event) => setExerciseMenu({ anchor: event.currentTarget, exerciseId })}
                        aria-label="Exercise options"
                      >
                        <MoreVertIcon sx={{ fontSize: '0.9rem' }} />
                      </IconButton>
                    </Box>
                  </td>

                  {/* One cell per week */}
                  {exByWeek.map(({ week, workout, ex }) => {
                    if (isCardio) {
                      return (
                        <td key={week.id} style={{ padding: '8px 12px', verticalAlign: 'top', textAlign: 'center' }}>
                          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, max-content)', justifyContent: 'center', gap: 0.75 }}>
                            {([
                              ['cardioDuration', 'Min', ex?.cardioDuration ?? null],
                              ['cardioDistance', 'km', ex?.cardioDistance ?? null],
                              ['cardioResistance', 'Resistance', ex?.cardioResistance ?? null],
                            ] as const).map(([field, label, value]) => (
                              <Box key={field} sx={{ minWidth: 0 }}>
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.65rem', mb: 0.25 }}>
                                  {label}
                                </Typography>
                                <input
                                  type="number"
                                  value={value ?? ''}
                                  onChange={(event) => {
                                    if (!ex || !workout) return;
                                    const nextValue = event.target.value === '' ? null : parseFloat(event.target.value);
                                    dispatch({
                                      type: 'UPDATE_CARDIO_DATA',
                                      planId,
                                      weekId: week.id,
                                      workoutId: workout.id,
                                      exerciseId: ex.id,
                                      field,
                                      value: isNaN(nextValue as number) ? null : nextValue,
                                    });
                                  }}
                                  placeholder="—"
                                  style={{ width: '4.25em', minWidth: 0, boxSizing: 'border-box', textAlign: 'center', border: '1px solid rgba(0,0,0,0.23)', borderRadius: '4px', padding: '4px 6px', fontSize: '0.78rem', fontFamily: 'inherit', background: 'transparent', color: 'inherit', outline: 'none', MozAppearance: 'textfield', WebkitAppearance: 'none', appearance: 'textfield' }}
                                />
                              </Box>
                            ))}
                          </Box>
                        </td>
                      );
                    }

                    const setModel = ex ? getExerciseSetModel(ex) : null;
                    const regularSets = setModel?.topLevelSets ?? [];
                    const lastRegularSet = setModel?.lastTopLevelSet ?? null;
                    const trailingDropSets = setModel?.trailingDropSets ?? [];

                    return (
                      <td key={week.id} style={{ padding: '8px 12px', verticalAlign: 'top', textAlign: 'center' }}>
                        {regularSets.length === 0 && (
                          <Typography variant="caption" color="text.disabled">
                            —
                          </Typography>
                        )}

                        {regularSets.map((set, si) => {
                          return (
                            <CompactSetEditor
                              key={set.id}
                              label={`S${si + 1}`}
                              weight={set.weight}
                              reps={set.reps}
                              onWeightChange={(weight) => {
                                if (ex && workout) {
                                  dispatch({
                                    type: 'UPDATE_SET_WEIGHT',
                                    planId,
                                    weekId: week.id,
                                    workoutId: workout.id,
                                    exerciseId: ex.id,
                                    setId: set.id,
                                    weight,
                                  });
                                }
                              }}
                              onRepsChange={(reps) => {
                                if (ex && workout) {
                                  dispatch({
                                    type: 'UPDATE_SET_REPS',
                                    planId,
                                    weekId: week.id,
                                    workoutId: workout.id,
                                    exerciseId: ex.id,
                                    setId: set.id,
                                    reps,
                                  });
                                }
                              }}
                            />
                          );
                        })}

                        {trailingDropSets.map((set, si) => (
                          <CompactSetEditor
                            key={set.id}
                            label={`D${si + 1}`}
                            weight={set.weight}
                            reps={set.reps}
                            onWeightChange={(weight) => {
                              if (ex && workout) {
                                dispatch({
                                  type: 'UPDATE_SET_WEIGHT',
                                  planId,
                                  weekId: week.id,
                                  workoutId: workout.id,
                                  exerciseId: ex.id,
                                  setId: set.id,
                                  weight,
                                });
                              }
                            }}
                            onRepsChange={(reps) => {
                              if (ex && workout) {
                                dispatch({
                                  type: 'UPDATE_SET_REPS',
                                  planId,
                                  weekId: week.id,
                                  workoutId: workout.id,
                                  exerciseId: ex.id,
                                  setId: set.id,
                                  reps,
                                });
                              }
                            }}
                          />
                        ))}

                        {/* + Set − */}
                        {ex && workout && (
                          <SetCountControls
                            canRemove={regularSets.length > 0}
                            onAdd={() => dispatch({ type: 'ADD_SET', planId, weekId: week.id, workoutId: workout.id, exerciseId: ex.id })}
                            onRemove={() => {
                              if (!confirmRemoveLastSetWithDrops(ex)) return;
                              dispatch({ type: 'REMOVE_SET', planId, weekId: week.id, workoutId: workout.id, exerciseId: ex.id });
                            }}
                            canRemoveDrop={dropControlsEnabled && trailingDropSets.length > 0}
                            onAddDrop={dropControlsEnabled ? (() => {
                              const parentSetId = lastRegularSet?.id;
                              if (parentSetId == null) return;
                              dispatch({ type: 'ADD_DROP_SET', planId, weekId: week.id, workoutId: workout.id, exerciseId: ex.id, parentSetId });
                            }) : undefined}
                            onRemoveDrop={dropControlsEnabled ? (() => {
                              const lastDrop = trailingDropSets[trailingDropSets.length - 1];
                              if (!lastDrop) return;
                              dispatch({ type: 'REMOVE_DROP_SET', planId, weekId: week.id, workoutId: workout.id, exerciseId: ex.id, setId: lastDrop.id });
                            }) : undefined}
                            layout="stacked"
                          />
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
                    onClick={() => {
                      setChangeExerciseId(null);
                      setPickerMode('add');
                      setPickerOpen(true);
                    }}
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
        title={pickerMode === 'change' ? 'Change Exercise' : 'Add Exercise'}
        onClose={() => {
          setPickerOpen(false);
          setChangeExerciseId(null);
        }}
        onSelect={(exercise) => {
          setPickerOpen(false);
          if (pickerMode === 'change' && targetExerciseId != null) {
            menuRows.forEach(({ week, workout, ex }) => {
              if (workout && ex) {
                dispatch({
                  type: 'UPDATE_EXERCISE',
                  planId,
                  weekId: week.id,
                  workoutId: workout.id,
                  workoutExerciseId: ex.id,
                  exerciseName: exercise.name,
                  exercises: allExercises,
                  category: exercise.category ?? 'resistance',
                });
              }
            });
            setExerciseMenu(null);
            setChangeExerciseId(null);
            return;
          }
          setChangeExerciseId(null);
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

      <Menu anchorEl={exerciseMenu?.anchor ?? null} open={Boolean(exerciseMenu)} onClose={() => setExerciseMenu(null)}>
        {menuExercise?.exercise?.category !== 'cardio' && (
          <ExerciseMenuActionItem
            onClick={() => {
              if (!exerciseMenu) return;
              setDetailsExerciseId(exerciseMenu.exerciseId);
              setExerciseMenu(null);
            }}
          >
            Edit details
          </ExerciseMenuActionItem>
        )}
        <ExerciseMenuDropAndBfrItems
          isCardio={menuExercise?.exercise?.category === 'cardio'}
          dropSetsEnabled={menuDropEnabled}
          isBfr={Boolean(menuExercise?.isBfr)}
          onToggleDropSets={(checked) => {
            if (targetExerciseId == null) return;
            if (!checked) {
              removeTrailingDropSets({ dispatch, planId, targets: menuTargets });
              setDropEnabledExerciseIds((prev) => {
                const next = new Set(prev);
                next.delete(targetExerciseId);
                return next;
              });
              return;
            }
            setDropEnabledExerciseIds((prev) => new Set(prev).add(targetExerciseId));
          }}
          onToggleBfr={(checked) => {
            setBfrEnabled({ dispatch, planId, targets: menuTargets, enabled: checked });
          }}
        />
        <ExerciseMenuActionItem
          color="error.main"
          onClick={() => {
            removeExercises({ dispatch, planId, targets: menuTargets });
            setExerciseMenu(null);
          }}
        >
          Delete exercise
        </ExerciseMenuActionItem>
      </Menu>
      <ExerciseDetailsDialog
        open={detailsExerciseId != null}
        repRange={menuExercise?.repRange ?? null}
        restTime={menuExercise?.restTime ?? null}
        onClose={() => setDetailsExerciseId(null)}
        onSave={({ repRange: nextRepRange, restTime: nextRestTime }) => {
          menuRows.forEach(({ week, workout, ex }) => {
            if (!workout || !ex) return;
            dispatch({
              type: 'UPDATE_REP_RANGE',
              planId,
              weekId: week.id,
              workoutId: workout.id,
              workoutExerciseId: ex.id,
              repRange: nextRepRange,
            });
            dispatch({
              type: 'UPDATE_REST_TIME',
              planId,
              weekId: week.id,
              workoutId: workout.id,
              workoutExerciseId: ex.id,
              restTime: nextRestTime,
            });
          });
          setDetailsExerciseId(null);
        }}
      />
    </Box>
  );
};

export default PlanMultiWeekTable;
