'use client';

import React, { useState } from 'react';
import { Box, IconButton, Menu, MenuItem, Switch, Typography } from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import { WorkoutExercisePrisma } from '@/types/dataTypes';
import { useWorkoutEditorContext } from '@/context/WorkoutEditorContext';
import { Dir } from '@/lib/useWorkoutEditor';
import { computeE1rm } from '@/lib/e1rm';
import { buildExerciseMetaParts, CompactSetEditor, ExerciseNameWithMeta, SetCountControls } from './PlanExercisePrimitives';
import ExercisePickerDialog from '@/app/user/workout/ExercisePickerDialog';

interface ExerciseProgressCardProps {
  exerciseLink: WorkoutExercisePrisma;
  prevExercise: WorkoutExercisePrisma | null;
  index: number;
  planId: number;
  weekId: number;
  workoutId: number;
  isFirst: boolean;
  isLast: boolean;
}

const cardGridColumns = '2.25em minmax(4.5em, 1fr) 3.25em minmax(7.75em, auto) 3.25em';
const cardGridSx = {
  display: 'grid',
  gridTemplateColumns: cardGridColumns,
  columnGap: 0.5,
  alignItems: 'center',
  width: '100%',
};
const cardioInputStyle: React.CSSProperties = {
  width: '100%',
  minWidth: 0,
  boxSizing: 'border-box',
  display: 'block',
  textAlign: 'center',
  border: '1px solid rgba(0,0,0,0.23)',
  borderRadius: '4px',
  padding: '7px 6px',
  fontSize: '0.78rem',
  fontFamily: 'inherit',
  background: 'transparent',
  color: 'inherit',
  outline: 'none',
  MozAppearance: 'textfield',
  WebkitAppearance: 'none',
  appearance: 'textfield',
};
const cardioValueSx = {
  textAlign: 'center',
  fontSize: '0.78rem',
  color: 'text.disabled',
  minHeight: '2.2rem',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  border: '1px solid transparent',
};

const ExerciseProgressCard = ({
  exerciseLink,
  prevExercise,
  index,
  planId,
  weekId,
  workoutId,
  isFirst,
  isLast,
}: ExerciseProgressCardProps) => {
  const { allExercises, dispatch } = useWorkoutEditorContext();
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [dropSetsEnabled, setDropSetsEnabled] = useState(false);

  const exerciseName = exerciseLink.exercise?.name || '(unnamed exercise)';
  const isCardio = exerciseLink.exercise?.category === 'cardio';
  const { repRange, restTime, targetRpe, targetRir } = exerciseLink;
  const regularSets = exerciseLink.sets
    .filter(s => !s.isDropSet)
    .sort((a, b) => a.order - b.order);
  const dropSets = exerciseLink.sets
    .filter(s => s.isDropSet)
    .sort((a, b) => a.order - b.order);
  const prevRegularSets = (prevExercise?.sets ?? [])
    .filter(s => !s.isDropSet)
    .sort((a, b) => a.order - b.order);
  const lastRegularSet = regularSets[regularSets.length - 1] ?? null;
  const trailingDropSets = lastRegularSet
    ? dropSets.filter((set) => set.parentSetId === lastRegularSet.id)
    : [];

  const maxSets = Math.max(regularSets.length, prevRegularSets.length);

  const metaParts = buildExerciseMetaParts({ repRange, restTime, targetRpe, targetRir });
  const showDropControls = dropSetsEnabled || trailingDropSets.length > 0;
  const removeTrailingDropSets = () => {
    trailingDropSets.forEach((set) => {
      dispatch({ type: 'REMOVE_DROP_SET', planId, weekId, workoutId, exerciseId: exerciseLink.id, setId: set.id });
    });
  };
  const handleRemoveSet = () => {
    if (lastRegularSet && trailingDropSets.length > 0) {
      const confirmed = window.confirm(`Remove the last set and its ${trailingDropSets.length} attached drop ${trailingDropSets.length === 1 ? 'set' : 'sets'}?`);
      if (!confirmed) return;
    }
    dispatch({ type: 'REMOVE_SET', planId, weekId, workoutId, exerciseId: exerciseLink.id });
  };

  return (
    <Box sx={{ mb: 2, borderBottom: 1, borderColor: 'divider', pb: 1.5 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.5 }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <ExerciseNameWithMeta name={exerciseName} metaParts={metaParts} index={index} isBfr={exerciseLink.isBfr} />
        </Box>
        <IconButton size="small" onClick={(e) => setMenuAnchor(e.currentTarget)} sx={{ ml: 0.5, mt: -0.25 }}>
          <MoreVertIcon fontSize="small" />
        </IconButton>
      </Box>

      {isCardio ? (
        <Box sx={{ mt: 1 }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 1.25 }}>
            <Box>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: 'block', textAlign: 'center', fontSize: '0.72rem', fontWeight: 700, letterSpacing: 0.4, mb: 0.5 }}
              >
                LAST
              </Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 0.5 }}>
                {(
                  [
                    ['Min', prevExercise?.cardioDuration],
                    ['km', prevExercise?.cardioDistance],
                    ['Res', prevExercise?.cardioResistance],
                  ] as const
                ).map(([label, value]) => (
                  <Box key={label} sx={{ minWidth: 0 }}>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ display: 'block', textAlign: 'center', fontSize: '0.65rem', fontWeight: 600, letterSpacing: 0.35, mb: 0.35 }}
                    >
                      {label}
                    </Typography>
                    <Box sx={cardioValueSx}>
                      {value ?? '—'}
                    </Box>
                  </Box>
                ))}
              </Box>
            </Box>

            <Box>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: 'block', textAlign: 'center', fontSize: '0.72rem', fontWeight: 700, letterSpacing: 0.4, mb: 0.5 }}
              >
                THIS WEEK
              </Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 0.5 }}>
                {(
                  [
                    ['cardioDuration', 'Min', exerciseLink.cardioDuration],
                    ['cardioDistance', 'km', exerciseLink.cardioDistance],
                    ['cardioResistance', 'Res', exerciseLink.cardioResistance],
                  ] as const
                ).map(([field, label, value]) => (
                  <Box key={field} sx={{ minWidth: 0 }}>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ display: 'block', textAlign: 'center', fontSize: '0.65rem', fontWeight: 600, letterSpacing: 0.35, mb: 0.35 }}
                    >
                      {label}
                    </Typography>
                    <input
                      type="number"
                      value={value ?? ''}
                      onChange={(event) => {
                        const nextValue = event.target.value === '' ? null : parseFloat(event.target.value);
                        dispatch({
                          type: 'UPDATE_CARDIO_DATA',
                          planId,
                          weekId,
                          workoutId,
                          exerciseId: exerciseLink.id,
                          field,
                          value: isNaN(nextValue as number) ? null : nextValue,
                        });
                      }}
                      placeholder="—"
                      style={cardioInputStyle}
                    />
                  </Box>
                ))}
              </Box>
            </Box>
          </Box>
        </Box>
      ) : (
        <>
          {/* Column headers */}
          <Box sx={{ ...cardGridSx, mb: 0.5 }}>
            <Box />
            <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center', fontSize: '0.65rem', fontWeight: 600, letterSpacing: 0.5 }}>
              LAST
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center', fontSize: '0.65rem', fontWeight: 600, letterSpacing: 0.5 }}>
              e1RM
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center', fontSize: '0.65rem', fontWeight: 600, letterSpacing: 0.5 }}>
              THIS WEEK
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center', fontSize: '0.65rem', fontWeight: 600, letterSpacing: 0.5 }}>
              e1RM
            </Typography>
          </Box>

          {/* Sets */}
          {Array.from({ length: maxSets }, (_, i) => {
            const set = regularSets[i];
            const prev = prevRegularSets[i];
            const prevText =
              prev?.weight != null && prev?.reps != null
                ? `${prev.weight}×${prev.reps}`
                : prev?.weight != null
                ? `${prev.weight}kg`
                : prev?.reps != null
                ? `×${prev.reps}`
                : '—';

            const prevE1rm = computeE1rm(prev?.weight, prev?.reps);
            const setE1rm = set ? computeE1rm(set.weight, set.reps) : null;

            return (
              <Box
                key={set?.id ?? `missing-${i}`}
                sx={{ ...cardGridSx, mb: 0.5 }}
              >
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                  S{i + 1}
                </Typography>

                <Typography
                  variant="caption"
                  color="text.disabled"
                  sx={{ textAlign: 'center', fontSize: '0.78rem' }}
                >
                  {prevText}
                </Typography>

                <Typography variant="caption" color="text.disabled" sx={{ textAlign: 'center', fontSize: '0.72rem' }}>
                  {prevE1rm != null ? Math.round(prevE1rm) : '—'}
                </Typography>

                {set ? (
                  <CompactSetEditor
                    weight={set.weight}
                    reps={set.reps}
                    showE1rm={false}
                    onWeightChange={(weight) =>
                      dispatch({
                        type: 'UPDATE_SET_WEIGHT',
                        planId,
                        weekId,
                        workoutId,
                        exerciseId: exerciseLink.id,
                        setId: set.id,
                        weight,
                      })
                    }
                    onRepsChange={(reps) =>
                      dispatch({
                        type: 'UPDATE_SET_REPS',
                        planId,
                        weekId,
                        workoutId,
                        exerciseId: exerciseLink.id,
                        setId: set.id,
                        reps,
                      })
                    }
                  />
                ) : (
                  <Typography variant="caption" color="text.disabled" sx={{ textAlign: 'center' }}>
                    —
                  </Typography>
                )}

                <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center', fontSize: '0.72rem' }}>
                  {setE1rm != null ? Math.round(setE1rm) : '—'}
                </Typography>
              </Box>
            );
          })}

          {trailingDropSets.map((set, index) => (
            <Box key={set.id} sx={{ ...cardGridSx, mb: 0.5 }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                D{index + 1}
              </Typography>
              <Typography variant="caption" color="text.disabled" sx={{ textAlign: 'center', fontSize: '0.78rem' }}>
                —
              </Typography>
              <Typography variant="caption" color="text.disabled" sx={{ textAlign: 'center', fontSize: '0.72rem' }}>
                —
              </Typography>
              <CompactSetEditor
                weight={set.weight}
                reps={set.reps}
                showE1rm={false}
                onWeightChange={(weight) =>
                  dispatch({
                    type: 'UPDATE_SET_WEIGHT',
                    planId,
                    weekId,
                    workoutId,
                    exerciseId: exerciseLink.id,
                    setId: set.id,
                    weight,
                  })
                }
                onRepsChange={(reps) =>
                  dispatch({
                    type: 'UPDATE_SET_REPS',
                    planId,
                    weekId,
                    workoutId,
                    exerciseId: exerciseLink.id,
                    setId: set.id,
                    reps,
                  })
                }
              />
              <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center', fontSize: '0.72rem' }}>
                —
              </Typography>
            </Box>
          ))}

          <Box sx={{ mt: 0.75, width: '100%' }}>
            <SetCountControls
              canRemove={regularSets.length > 0}
              onAdd={() => dispatch({ type: 'ADD_SET', planId, weekId, workoutId, exerciseId: exerciseLink.id })}
              onRemove={handleRemoveSet}
              canRemoveDrop={showDropControls && trailingDropSets.length > 0}
              onAddDrop={showDropControls ? (() => {
                const parentSetId = lastRegularSet?.id;
                if (parentSetId == null) return;
                dispatch({ type: 'ADD_DROP_SET', planId, weekId, workoutId, exerciseId: exerciseLink.id, parentSetId });
              }) : undefined}
              onRemoveDrop={showDropControls ? (() => {
                const lastDrop = trailingDropSets[trailingDropSets.length - 1];
                if (!lastDrop) return;
                dispatch({ type: 'REMOVE_DROP_SET', planId, weekId, workoutId, exerciseId: exerciseLink.id, setId: lastDrop.id });
              }) : undefined}
              layout="spread"
            />
          </Box>
        </>
      )}

      {/* Contextual menu */}
      <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={() => setMenuAnchor(null)}>
        <MenuItem
          onClick={() => {
            setMenuAnchor(null);
            setPickerOpen(true);
          }}
        >
          Change exercise
        </MenuItem>
        {!isFirst && (
          <MenuItem
            onClick={() => {
              dispatch({ type: 'MOVE_EXERCISE', planId, weekId, workoutId, dir: Dir.UP, index });
              setMenuAnchor(null);
            }}
          >
            Move up
          </MenuItem>
        )}
        {!isLast && (
          <MenuItem
            onClick={() => {
              dispatch({ type: 'MOVE_EXERCISE', planId, weekId, workoutId, dir: Dir.DOWN, index });
              setMenuAnchor(null);
            }}
          >
            Move down
          </MenuItem>
        )}
        {!isCardio && (
          <MenuItem
            onClick={() => {
              if (showDropControls) {
                removeTrailingDropSets();
                setDropSetsEnabled(false);
                return;
              }
              setDropSetsEnabled(true);
            }}
            sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}
          >
            <Typography variant="inherit">Enable drop sets</Typography>
            <Switch
              size="small"
              edge="end"
              checked={showDropControls}
              tabIndex={-1}
              disableRipple
              onClick={(e) => e.stopPropagation()}
              onChange={(_, checked) => {
                if (!checked) {
                  removeTrailingDropSets();
                  setDropSetsEnabled(false);
                  return;
                }
                setDropSetsEnabled(true);
              }}
              inputProps={{ 'aria-label': 'Toggle drop sets' }}
            />
          </MenuItem>
        )}
        {!isCardio && (
          <MenuItem
            onClick={() => {
              dispatch({
                type: 'TOGGLE_BFR',
                planId,
                weekId,
                workoutId,
                workoutExerciseId: exerciseLink.id,
                enabled: !exerciseLink.isBfr,
              });
            }}
            sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}
          >
            <Typography variant="inherit">BFR mode</Typography>
            <Switch
              size="small"
              edge="end"
              checked={exerciseLink.isBfr}
              tabIndex={-1}
              disableRipple
              onClick={(e) => e.stopPropagation()}
              onChange={(_, checked) => {
                dispatch({
                  type: 'TOGGLE_BFR',
                  planId,
                  weekId,
                  workoutId,
                  workoutExerciseId: exerciseLink.id,
                  enabled: checked,
                });
              }}
              inputProps={{ 'aria-label': 'Toggle BFR mode' }}
            />
          </MenuItem>
        )}
        <MenuItem
          onClick={() => {
            dispatch({ type: 'REMOVE_EXERCISE', planId, weekId, workoutId, exerciseId: exerciseLink.id });
            setMenuAnchor(null);
          }}
          sx={{ color: 'error.main' }}
        >
          Remove
        </MenuItem>
      </Menu>

      <ExercisePickerDialog
        open={pickerOpen}
        title="Change Exercise"
        onClose={() => setPickerOpen(false)}
        onSelect={(exercise) => {
          setPickerOpen(false);
          dispatch({
            type: 'UPDATE_EXERCISE',
            planId,
            weekId,
            workoutId,
            workoutExerciseId: exerciseLink.id,
            exerciseName: exercise.name,
            exercises: allExercises,
            category: exercise.category ?? 'resistance',
          });
        }}
      />
    </Box>
  );
};

export default ExerciseProgressCard;
