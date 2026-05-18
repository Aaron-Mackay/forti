'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Box, Chip, Collapse, IconButton, Menu, TextField, Tooltip, Typography } from '@mui/material';
import { PlanPrisma } from '@/types/dataTypes';
import { useWorkoutEditorContext } from '@/context/WorkoutEditorContext';
import { WorkoutEditorAction } from '@lib/useWorkoutEditor';
import { getWeekStatus } from '@/lib/workoutProgress';
import ExercisePickerDialog from '@/app/user/workout/ExercisePickerDialog';
import { ExerciseMenuActionItem, ExerciseMenuDropAndBfrItems } from './ExerciseMenuItems';
import { getLatestTrackedWeekId, stripWorkoutSuffix } from './planPresentation';
import { buildExerciseMetaParts, CompactSetEditor, EditableExerciseNameWithMeta, SetCountControls } from './PlanExercisePrimitives';
import { confirmRemoveLastSetWithDrops, getExerciseSetModel } from './exerciseSetModel';
import { hasTrailingDropSets, removeExercises, removeTrailingDropSets, setBfrEnabled, setRequiresRecordingEnabled } from './exerciseMenuActions';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import NotesOutlinedIcon from '@mui/icons-material/NotesOutlined';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExerciseDetailsDialog from './ExerciseDetailsDialog';
import ScrollEdgeFades from '@/components/shell/ScrollEdgeFades';
import { useScrollEdgeFades } from '@lib/hooks/useScrollEdgeFades';
import { signalTokens } from '@lib/signal/tokens';

interface PlanMultiWeekTableProps {
  plan: PlanPrisma;
  planId: number;
  highlightedWorkoutIds?: Set<number>;
  dispatchOverride?: React.Dispatch<WorkoutEditorAction>;
  runWithCheckpoint?: (fn: () => void) => void;
  beginBufferedEdit?: () => void;
  commitBufferedEdit?: () => void;
}

const PlanMultiWeekTable = ({ plan, planId, highlightedWorkoutIds, dispatchOverride, runWithCheckpoint, beginBufferedEdit, commitBufferedEdit }: PlanMultiWeekTableProps) => {
  const context = useWorkoutEditorContext();
  const { allExercises } = context;
  const dispatch = dispatchOverride ?? context.dispatch;
  const withCheckpoint = runWithCheckpoint ?? ((fn: () => void) => fn());
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerMode, setPickerMode] = useState<'add' | 'change'>('add');
  const [exerciseMenu, setExerciseMenu] = useState<null | { anchor: HTMLElement; rowIndex: number }>(null);
  const [changeExerciseRowIndex, setChangeExerciseRowIndex] = useState<number | null>(null);
  const [detailsExerciseRowIndex, setDetailsExerciseRowIndex] = useState<number | null>(null);
  const [dropEnabledExerciseRows, setDropEnabledExerciseRows] = useState<Set<number>>(new Set());
  const [notesExpanded, setNotesExpanded] = useState(false);
  const sortedWeeks = [...plan.weeks].sort((a, b) => a.order - b.order);

  const maxWorkoutCount = Math.max(0, ...plan.weeks.map(w => w.workouts.length));
  const [selectedWorkoutOrder, setSelectedWorkoutOrder] = useState(1);
  useEffect(() => {
    setNotesExpanded(false);
  }, [selectedWorkoutOrder, planId]);

  // Find the id of the latest week that has any weight/reps entered
  const scrollTargetWeekId = getLatestTrackedWeekId(plan);

  const highlightedSlotOrders = React.useMemo(() => {
    const orders = new Set<number>();
    if (!highlightedWorkoutIds || highlightedWorkoutIds.size === 0) return orders;
    for (const week of plan.weeks) {
      for (const workout of week.workouts) {
        if (highlightedWorkoutIds.has(workout.id)) orders.add(workout.order);
      }
    }
    return orders;
  }, [plan.weeks, highlightedWorkoutIds]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const { scrollRef: horizontalFadeScrollRef, handleScroll: handleHorizontalScroll, showStartFade: showLeftFade, showEndFade: showRightFade } =
    useScrollEdgeFades<HTMLDivElement>({ axis: 'x', threshold: 4 });
  const { scrollRef: verticalFadeScrollRef, handleScroll: handleVerticalScroll, showStartFade: showTopFade, showEndFade: showBottomFade } =
    useScrollEdgeFades<HTMLDivElement>({ axis: 'y', threshold: 4 });
  useEffect(() => {
    const highlightTarget = scrollRef.current?.querySelector('[data-checkin-highlight-cell="true"]');
    if (highlightTarget) {
      highlightTarget.scrollIntoView({ behavior: 'instant', block: 'nearest', inline: 'center' });
      return;
    }
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
  const workoutsByWeek = sortedWeeks.map((week) => {
    const workout = week.workouts.find((w) => w.order === selectedWorkoutOrder) ?? null;
    const sortedExercises = workout ? [...workout.exercises].sort((a, b) => a.order - b.order) : [];
    return { week, workout, sortedExercises };
  });

  // First non-completed week is "active" (current); past = completed
  const activeWeekIdx = sortedWeeks.findIndex(w => getWeekStatus(w) !== 'completed');
  const activeWeekOrder = activeWeekIdx >= 0
    ? sortedWeeks[activeWeekIdx].order
    : sortedWeeks[sortedWeeks.length - 1]?.order ?? 1;

  const maxExerciseCount = Math.max(0, ...workoutsByWeek.map(({ sortedExercises }) => sortedExercises.length));
  const exerciseRows: Array<{
    rowIndex: number;
    templateExercise: (typeof workoutsByWeek)[number]['sortedExercises'][number];
  }> = [];
  for (let rowIndex = 0; rowIndex < maxExerciseCount; rowIndex += 1) {
    const templateExercise = workoutsByWeek
      .map(({ sortedExercises }) => sortedExercises[rowIndex] ?? null)
      .find((exercise) => exercise != null);
    if (templateExercise) {
      exerciseRows.push({ rowIndex, templateExercise });
    }
  }

  // Active workout (for + Exercise action)
  const activeWorkout = workoutsByWeek.find(x => x.week.order === activeWeekOrder)?.workout ?? null;
  const targetExerciseRowIndex = exerciseMenu?.rowIndex ?? changeExerciseRowIndex ?? detailsExerciseRowIndex;
  const menuRows = targetExerciseRowIndex != null
    ? workoutsByWeek
        .map(({ week, workout, sortedExercises }) => ({
          week,
          workout,
          ex: sortedExercises[targetExerciseRowIndex] ?? null,
        }))
        .filter(({ ex }) => ex)
    : [];
  const menuExercise = menuRows[0]?.ex ?? null;
  const menuTargets = menuRows.flatMap(({ week, workout, ex }) =>
    workout && ex ? [{ weekId: week.id, workoutId: workout.id, exercise: ex }] : [],
  );
  const menuHasTrailingDrops = menuTargets.some((target) => hasTrailingDropSets(target.exercise));
  const menuDropEnabled = targetExerciseRowIndex != null
    ? (dropEnabledExerciseRows.has(targetExerciseRowIndex) || menuHasTrailingDrops)
    : false;
  const lastWeek = sortedWeeks[sortedWeeks.length - 1] ?? null;
  const canRemoveWeek = sortedWeeks.length > 1;

  return (
    <Box>
      {/* Workout chips + add */}
      <Box sx={{ display: 'flex', gap: 0.75, overflowX: 'auto', pb: 1, mb: 1, alignItems: 'center' }}>
        {slotLabels.map((label, i) => {
          const isSelected = selectedWorkoutOrder === i + 1;
          const isHighlighted = highlightedSlotOrders.has(i + 1);
          return (
            <Chip
              key={i}
              label={label}
              onClick={() => setSelectedWorkoutOrder(i + 1)}
              variant={isSelected ? 'filled' : 'outlined'}
              color={isSelected ? 'primary' : 'default'}
              size="small"
              sx={{
                flexShrink: 0,
                cursor: 'pointer',
                ...(isHighlighted && isSelected && {
                  boxShadow: `inset 0 0 0 1px ${signalTokens.signal.deep}`,
                }),
                ...(isHighlighted && !isSelected && {
                  backgroundColor: signalTokens.signal.dim,
                  borderColor: signalTokens.signal.deep,
                }),
              }}
            />
          );
        })}
        <Chip
          label="+ Workout"
          onClick={() => {
            const newOrder = maxWorkoutCount + 1;
            setSelectedWorkoutOrder(newOrder);
            setChangeExerciseRowIndex(null);
            const activeWeek = sortedWeeks.find(w => w.order === activeWeekOrder);
            if (activeWeek) {
              withCheckpoint(() => dispatch({ type: 'ADD_WORKOUT', planId, weekId: activeWeek.id }));
            }
          }}
          variant="outlined"
          size="small"
          sx={{ flexShrink: 0, cursor: 'pointer', borderStyle: 'dashed' }}
        />
      </Box>

      {/* Editable workout name */}
      {activeWorkout && (
        <Box sx={{ mb: 2 }}>
          {(highlightedWorkoutIds?.has(activeWorkout.id) ?? false) && (
            <Box
              component="span"
              sx={{
                display: 'inline-block',
                mb: 0.75,
                px: 0.75,
                py: 0.15,
                fontFamily: signalTokens.fontVar.mono,
                fontSize: 10,
                lineHeight: 1.4,
                color: signalTokens.surface.planning.ink,
                border: `1px solid ${signalTokens.signal.deep}`,
                backgroundColor: signalTokens.signal.dim,
                borderRadius: 999,
                whiteSpace: 'nowrap',
              }}
            >
              Completed in check-in week
            </Box>
          )}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <TextField
              size="small"
              label="Workout name"
              value={activeWorkout.name ?? ''}
              onChange={(e) => {
                workoutsByWeek.forEach(({ week, workout: wo }) => {
                  if (wo) {
                    dispatch({
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
              onFocus={beginBufferedEdit}
              onBlur={commitBufferedEdit}
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

          <Box sx={{ mt: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <NotesOutlinedIcon sx={{ fontSize: '0.95rem', color: 'text.secondary' }} />
              <Typography variant="caption" color="text.secondary" sx={{ flex: 1 }}>
                Workout notes (applies to this workout across weeks)
              </Typography>
              <Tooltip title={notesExpanded ? 'Collapse notes' : 'Expand notes'}>
                <IconButton
                  size="small"
                  onClick={() => setNotesExpanded((prev) => !prev)}
                  aria-label={notesExpanded ? 'Collapse workout notes' : 'Expand workout notes'}
                >
                  {notesExpanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
                </IconButton>
              </Tooltip>
            </Box>

            {!notesExpanded && Boolean(activeWorkout.notes?.trim()) && (
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{
                  mt: 0.5,
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  cursor: 'pointer',
                }}
                onClick={() => setNotesExpanded(true)}
              >
                {activeWorkout.notes}
              </Typography>
            )}

            <Collapse in={notesExpanded || !activeWorkout.notes?.trim()} unmountOnExit={false}>
              <TextField
                size="small"
                placeholder="Add workout notes..."
                value={activeWorkout.notes ?? ''}
                onChange={(event) => {
                  workoutsByWeek.forEach(({ week, workout: wo }) => {
                    if (wo) {
                      dispatch({
                        type: 'UPDATE_WORKOUT_NOTES',
                        planId,
                        weekId: week.id,
                        workoutId: wo.id,
                        notes: event.target.value,
                      });
                    }
                  });
                }}
                multiline
                minRows={2}
                fullWidth
                sx={{ mt: 0.5, maxWidth: 600 }}
                onFocus={beginBufferedEdit}
                onBlur={commitBufferedEdit}
              />
            </Collapse>
          </Box>
        </Box>
      )}

      {/* Scrollable table */}
      <Box sx={{ position: 'relative' }}>
      <Box
        ref={(node: HTMLDivElement | null) => {
          scrollRef.current = node;
          horizontalFadeScrollRef.current = node;
          verticalFadeScrollRef.current = node;
        }}
        onScroll={() => {
          handleHorizontalScroll();
          handleVerticalScroll();
        }}
        sx={{ overflowX: 'auto', overflowY: 'auto' }}
      >
        <Box sx={{ display: 'flex', alignItems: 'stretch', width: 'max-content' }}>
          <table style={{ borderCollapse: 'collapse' }}>
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
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                      <span>
                        Wk {week.order}
                        {week.order === activeWeekOrder && (
                          <span style={{ fontSize: '0.65rem', marginLeft: '0.25em', opacity: 0.7 }}>(now)</span>
                        )}
                      </span>
                      {canRemoveWeek && week.id === lastWeek?.id && (
                        <button
                          type="button"
                          onClick={() => withCheckpoint(() => dispatch({ type: 'REMOVE_WEEK', planId, weekId: week.id }))}
                          aria-label={`Delete week ${week.order}`}
                          style={{
                            border: 'none',
                            background: 'transparent',
                            color: 'inherit',
                            cursor: 'pointer',
                            padding: 0,
                            fontSize: '0.8rem',
                            lineHeight: 1,
                            opacity: 0.55,
                          }}
                        >
                          ×
                        </button>
                      )}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
            {exerciseRows.map(({ rowIndex, templateExercise }) => {
              const { name, category, repRange, restTime, targetRpe, targetRir } = {
                name: templateExercise.exercise?.name ?? '(unnamed)',
                category: templateExercise.exercise?.category ?? null,
                repRange: templateExercise.repRange,
                restTime: templateExercise.restTime,
                targetRpe: templateExercise.targetRpe,
                targetRir: templateExercise.targetRir,
              };
              const exByWeek = workoutsByWeek.map(({ week, workout, sortedExercises }) => ({
                week,
                workout,
                ex: sortedExercises[rowIndex] ?? null,
              }));
              const isCardio = category === 'cardio';
              const dropControlsEnabled = dropEnabledExerciseRows.has(rowIndex) || exByWeek.some(({ ex }) => {
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
                <tr key={rowIndex} style={{ borderTop: '1px solid var(--mui-palette-divider, #e0e0e0)' }}>
                  {/* Exercise name + meta */}
                  <td style={{ padding: '8px 12px 8px 0', verticalAlign: 'top' }}>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 0.5 }}>
                      <Box sx={{ minWidth: 0 }}>
                        <EditableExerciseNameWithMeta
                          name={name}
                          metaParts={metaParts}
                          isBfr={isBfr}
                          onClick={() => {
                            setChangeExerciseRowIndex(rowIndex);
                            setPickerMode('change');
                            setPickerOpen(true);
                          }}
                        />
                      </Box>
                        <IconButton
                          size="small"
                          sx={{ p: 0.25, opacity: 0.6, '&:hover': { opacity: 1 } }}
                        onClick={(event) => setExerciseMenu({ anchor: event.currentTarget, rowIndex })}
                          aria-label="Exercise options"
                        >
                        <MoreVertIcon sx={{ fontSize: '0.9rem' }} />
                      </IconButton>
                    </Box>
                  </td>

                  {/* One cell per week */}
                  {exByWeek.map(({ week, workout, ex }) => {
                    const cellIsHighlighted = workout != null && (highlightedWorkoutIds?.has(workout.id) ?? false);
                    const cellHighlightStyle = cellIsHighlighted
                      ? {
                          backgroundColor: signalTokens.signal.dim,
                          boxShadow: `inset 0 0 0 1px ${signalTokens.signal.deep}`,
                        }
                      : {};
                    if (isCardio) {
                      return (
                        <td
                          key={week.id}
                          data-checkin-highlight-cell={cellIsHighlighted ? 'true' : undefined}
                          style={{ padding: '8px 12px', verticalAlign: 'top', textAlign: 'center', ...cellHighlightStyle }}
                        >
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
                      <td
                        key={week.id}
                        data-checkin-highlight-cell={cellIsHighlighted ? 'true' : undefined}
                        style={{ padding: '8px 12px', verticalAlign: 'top', textAlign: 'center', ...cellHighlightStyle }}
                      >
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
                      setChangeExerciseRowIndex(null);
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
          <Box
            component="button"
            type="button"
            onClick={() => {
              if (lastWeek) dispatch({ type: 'DUPLICATE_WEEK', planId, weekId: lastWeek.id });
            }}
            aria-label="Add week"
            sx={{
              background: 'transparent',
              mt: '28px',
              ml: 2,
              minWidth: '8rem',
              alignSelf: 'stretch',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '2px dashed',
              borderColor: 'divider',
              borderRadius: 1,
              cursor: 'pointer',
              color: 'primary.main',
              opacity: 0.35,
              px: 1,
              '&:hover': { opacity: 0.9 },
              transition: 'opacity 0.15s',
            }}
          >
            <AddIcon sx={{ fontSize: '1rem' }} />
          </Box>
        </Box>
      </Box>
      <ScrollEdgeFades axis="x" showStart={showLeftFade} showEnd={showRightFade} size={24} background="paper" />
      <ScrollEdgeFades axis="y" showStart={showTopFade} showEnd={showBottomFade} size={24} background="paper" />
      </Box>

      <ExercisePickerDialog
        open={pickerOpen}
        title={pickerMode === 'change' ? 'Change Exercise' : 'Add Exercise'}
        onClose={() => {
          setPickerOpen(false);
          setChangeExerciseRowIndex(null);
        }}
        onSelect={(exercise) => {
          setPickerOpen(false);
          if (pickerMode === 'change' && targetExerciseRowIndex != null) {
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
            setChangeExerciseRowIndex(null);
            return;
          }
          setChangeExerciseRowIndex(null);
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
              setDetailsExerciseRowIndex(exerciseMenu.rowIndex);
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
          requiresRecording={Boolean(menuExercise?.requiresRecording)}
          onToggleDropSets={(checked) => {
            if (targetExerciseRowIndex == null) return;
            if (!checked) {
              removeTrailingDropSets({ dispatch, planId, targets: menuTargets });
              setDropEnabledExerciseRows((prev) => {
                const next = new Set(prev);
                next.delete(targetExerciseRowIndex);
                return next;
              });
              return;
            }
            setDropEnabledExerciseRows((prev) => new Set(prev).add(targetExerciseRowIndex));
          }}
          onToggleBfr={(checked) => {
            setBfrEnabled({ dispatch, planId, targets: menuTargets, enabled: checked });
          }}
          onToggleRequiresRecording={(checked) => {
            setRequiresRecordingEnabled({ dispatch, planId, targets: menuTargets, enabled: checked });
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
        open={detailsExerciseRowIndex != null}
        repRange={menuExercise?.repRange ?? null}
        restTime={menuExercise?.restTime ?? null}
        onClose={() => setDetailsExerciseRowIndex(null)}
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
          setDetailsExerciseRowIndex(null);
        }}
      />
    </Box>
  );
};

export default PlanMultiWeekTable;
