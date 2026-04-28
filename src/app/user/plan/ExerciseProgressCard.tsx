'use client';

import React, { useState } from 'react';
import { Box, IconButton, Menu, Typography } from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import { WorkoutExercisePrisma } from '@/types/dataTypes';
import { useWorkoutEditorContext } from '@/context/WorkoutEditorContext';
import { Dir } from '@/lib/useWorkoutEditor';
import { computeE1rm } from '@/lib/e1rm';
import { getE1rmDeltaDirection } from './planPresentation';
import { ExerciseMenuActionItem, ExerciseMenuDropAndBfrItems, ExerciseMenuMoveItems } from './ExerciseMenuItems';
import { buildExerciseMetaParts, CompactSetEditor, EditableExerciseNameWithMeta, SetCountControls } from './PlanExercisePrimitives';
import { confirmRemoveLastSetWithDrops, getExerciseSetModel } from './exerciseSetModel';
import { hasTrailingDropSets, removeExercises, removeTrailingDropSets as removeTrailingDropSetsForTargets, setBfrEnabled } from './exerciseMenuActions';
import ExercisePickerDialog from '@/app/user/workout/ExercisePickerDialog';
import ExerciseDetailsDialog from './ExerciseDetailsDialog';

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

const e1rmDeltaMeta = {
  up: { icon: '↑', color: 'success.main', ariaLabel: 'e1RM increased from previous week' },
  down: { icon: '↓', color: 'error.main', ariaLabel: 'e1RM decreased from previous week' },
  flat: { icon: '→', color: 'text.disabled', ariaLabel: 'e1RM unchanged from previous week' },
} as const;

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
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [dropSetsEnabled, setDropSetsEnabled] = useState(false);

  const exerciseName = exerciseLink.exercise?.name ?? null;
  const isCardio = exerciseLink.exercise?.category === 'cardio';
  const { repRange, restTime, targetRpe, targetRir } = exerciseLink;
  const { lastTopLevelSet, topLevelSets: regularSets, trailingDropSets } = getExerciseSetModel(exerciseLink);
  const prevRegularSets = (prevExercise?.sets ?? [])
    .filter(s => !s.isDropSet)
    .sort((a, b) => a.order - b.order);

  const maxSets = Math.max(regularSets.length, prevRegularSets.length);

  const metaParts = buildExerciseMetaParts({ repRange, restTime, targetRpe, targetRir });
  const showDropControls = dropSetsEnabled || hasTrailingDropSets(exerciseLink);
  const menuTarget = { weekId, workoutId, exercise: exerciseLink };
  const handleDisableDropSets = () => {
    removeTrailingDropSetsForTargets({ dispatch, planId, targets: [menuTarget] });
  };
  const handleRemoveSet = () => {
    if (!confirmRemoveLastSetWithDrops(exerciseLink)) return
    dispatch({ type: 'REMOVE_SET', planId, weekId, workoutId, exerciseId: exerciseLink.id });
  };

  return (
    <Box sx={{ mb: 2, borderBottom: 1, borderColor: 'divider', pb: 1.5 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.5 }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <EditableExerciseNameWithMeta
            name={exerciseName}
            metaParts={metaParts}
            index={index}
            isBfr={exerciseLink.isBfr}
            onClick={() => setPickerOpen(true)}
          />
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
            const delta = getE1rmDeltaDirection(setE1rm, prevE1rm);

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
                  {setE1rm != null ? (
                    <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.4 }}>
                      <Box component="span">{Math.round(setE1rm)}</Box>
                      {delta !== 'none' ? (
                        <Box
                          component="span"
                          sx={{ color: e1rmDeltaMeta[delta].color, fontSize: '0.68rem', lineHeight: 1 }}
                          aria-label={e1rmDeltaMeta[delta].ariaLabel}
                        >
                          {e1rmDeltaMeta[delta].icon}
                        </Box>
                      ) : null}
                    </Box>
                  ) : '—'}
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
                const parentSetId = lastTopLevelSet?.id;
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
        {!isCardio && (
          <ExerciseMenuActionItem
            onClick={() => {
              setMenuAnchor(null);
              setDetailsOpen(true);
            }}
          >
            Edit details
          </ExerciseMenuActionItem>
        )}
        <ExerciseMenuMoveItems
          canMoveUp={!isFirst}
          canMoveDown={!isLast}
          onMoveUp={() => {
            dispatch({ type: 'MOVE_EXERCISE', planId, weekId, workoutId, dir: Dir.UP, index });
            setMenuAnchor(null);
          }}
          onMoveDown={() => {
            dispatch({ type: 'MOVE_EXERCISE', planId, weekId, workoutId, dir: Dir.DOWN, index });
            setMenuAnchor(null);
          }}
        />
        <ExerciseMenuDropAndBfrItems
          isCardio={isCardio}
          dropSetsEnabled={showDropControls}
          isBfr={exerciseLink.isBfr}
          onToggleDropSets={(checked) => {
            if (!checked) {
              handleDisableDropSets();
              setDropSetsEnabled(false);
              return;
            }
            setDropSetsEnabled(true);
          }}
          onToggleBfr={(checked) => {
            setBfrEnabled({ dispatch, planId, targets: [menuTarget], enabled: checked });
          }}
        />
        <ExerciseMenuActionItem
          color="error.main"
          onClick={() => {
            removeExercises({ dispatch, planId, targets: [menuTarget] });
            setMenuAnchor(null);
          }}
        >
          Remove
        </ExerciseMenuActionItem>
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
      <ExerciseDetailsDialog
        open={detailsOpen}
        repRange={exerciseLink.repRange}
        restTime={exerciseLink.restTime}
        onClose={() => setDetailsOpen(false)}
        onSave={({ repRange: nextRepRange, restTime: nextRestTime }) => {
          dispatch({
            type: 'UPDATE_REP_RANGE',
            planId,
            weekId,
            workoutId,
            workoutExerciseId: exerciseLink.id,
            repRange: nextRepRange,
          });
          dispatch({
            type: 'UPDATE_REST_TIME',
            planId,
            weekId,
            workoutId,
            workoutExerciseId: exerciseLink.id,
            restTime: nextRestTime,
          });
          setDetailsOpen(false);
        }}
      />
    </Box>
  );
};

export default ExerciseProgressCard;
