'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Box, Divider, IconButton, Menu, MenuItem, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import DragHandleIcon from '@mui/icons-material/DragHandle';
import EditIcon from '@mui/icons-material/Edit';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  horizontalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { PlanPrisma, WorkoutPrisma, WorkoutExercisePrisma } from '@/types/dataTypes';
import { Dir, WorkoutEditorAction } from '@lib/useWorkoutEditor';
import { useWorkoutEditorContext } from '@/context/WorkoutEditorContext';
import { computeE1rm } from '@lib/e1rm';
import ExercisePickerDialog from '@/app/user/workout/ExercisePickerDialog';
import type { ActionDispatch } from 'react';

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



type WeekData = PlanPrisma['weeks'][number];

interface MenuState {
  anchor: HTMLElement;
  weekId: number;
  workoutId: number;
  exerciseId: number;
  exerciseIndex: number;
  exerciseCount: number;
  isCardio: boolean;
}

interface PlanSheetViewProps {
  plan: PlanPrisma;
  planId: number;
  zoom: number;
  onZoomChange: (zoom: number) => void;
  arrangeMode: boolean;
  creationMode?: boolean;
  showWeekHeaders?: boolean;
}

// ── SortableExerciseTbody ──────────────────────────────────────────────────────

interface SortableExerciseTbodyProps {
  ex: WorkoutExercisePrisma;
  exFullIndex: number;
  exerciseCount: number;
  maxSets: number;
  planId: number;
  weekId: number;
  workoutId: number;
  dispatch: ActionDispatch<[WorkoutEditorAction]>;
  arrangeMode: boolean;
  openRenamePicker: (weekId: number, workoutId: number, workoutExerciseId: number) => void;
  setMenuState: (state: MenuState | null) => void;
  bestE1rm: number | null;
}

const SortableExerciseTbody = ({
  ex,
  exFullIndex,
  exerciseCount,
  maxSets,
  planId,
  weekId,
  workoutId,
  dispatch,
  arrangeMode,
  openRenamePicker,
  setMenuState,
  bestE1rm,
}: SortableExerciseTbodyProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: 'ex-' + ex.id,
  });

  const topLevelSets = ex.sets.filter(s => !s.isDropSet).sort((a, b) => a.order - b.order);
  const dropSets = ex.sets.filter(s => s.isDropSet).sort((a, b) => a.order - b.order);

  const dropsByParent = new Map<number, typeof dropSets>();
  for (const ds of dropSets) {
    if (ds.parentSetId == null) continue;
    if (!dropsByParent.has(ds.parentSetId)) dropsByParent.set(ds.parentSetId, []);
    dropsByParent.get(ds.parentSetId)!.push(ds);
  }

  const tbodyStyle: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    display: 'table-row-group',
  };

  return (
    <tbody ref={setNodeRef} style={tbodyStyle}>
      <tr>
        <td style={{ ...cellSx, textAlign: 'left', maxWidth: '14rem', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {arrangeMode && (
            <span
              {...attributes}
              {...listeners}
              style={{ cursor: 'grab', marginRight: '4px', opacity: 0.45, verticalAlign: 'middle', display: 'inline-flex' }}
            >
              <DragHandleIcon style={{ fontSize: '0.9rem' }} />
            </span>
          )}
          {!arrangeMode ? (
            ex.exercise?.name ? (
              <Box
                component="span"
                onClick={() => openRenamePicker(weekId, workoutId, ex.id)}
                sx={{
                  display: 'inline-flex', alignItems: 'center', gap: 0.25,
                  cursor: 'pointer', fontWeight: 600, fontSize: '0.75rem',
                  borderBottom: '1px dashed', borderColor: 'divider',
                  '&:hover .edit-icon': { opacity: 1 },
                }}
              >
                {ex.exercise.name}
                <EditIcon className="edit-icon" sx={{ fontSize: '0.65rem', opacity: 0.35, transition: 'opacity 0.15s', flexShrink: 0 }} />
              </Box>
            ) : (
              <Box
                component="span"
                onClick={() => openRenamePicker(weekId, workoutId, ex.id)}
                aria-label="Add exercise"
                sx={{
                  display: 'inline-flex', alignItems: 'center', gap: 0.25,
                  cursor: 'pointer', fontSize: '0.7rem', color: 'text.disabled',
                  border: '1px dashed', borderColor: 'divider', borderRadius: 0.5,
                  px: 0.5, py: 0.25,
                  '&:hover': { color: 'text.secondary', borderColor: 'text.secondary' },
                  transition: 'color 0.15s, border-color 0.15s',
                }}
              >
                <EditIcon sx={{ fontSize: '0.65rem' }} />
                Add exercise
              </Box>
            )
          ) : (
            <Box component="span" sx={{ fontWeight: 600, fontSize: '0.75rem' }}>
              {ex.exercise?.name ?? ''}
            </Box>
          )}
        </td>
        <td style={{ ...cellSx, textAlign: 'center' }}>
          <input
            type="text"
            value={ex.repRange ?? ''}
            onChange={(e) => dispatch({ type: 'UPDATE_REP_RANGE', planId, weekId, workoutId, workoutExerciseId: ex.id, repRange: e.target.value })}
            placeholder="—"
            style={{ ...inputSx, width: '3.5em' }}
          />
        </td>
        <td style={{ ...cellSx, textAlign: 'center' }}>
          <input
            type="text"
            value={ex.restTime ?? ''}
            onChange={(e) => dispatch({ type: 'UPDATE_REST_TIME', planId, weekId, workoutId, workoutExerciseId: ex.id, restTime: e.target.value })}
            placeholder="—"
            style={{ ...inputSx, width: '3.5em' }}
          />
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
          return (
            <React.Fragment key={si}>
              <td style={{ ...cellSx, textAlign: 'center' }}>
                <input
                  type="number"
                  value={set.weight ?? ''}
                  onChange={(e) => {
                    const v = e.target.value === '' ? null : parseFloat(e.target.value);
                    dispatch({ type: 'UPDATE_SET_WEIGHT', planId, weekId, workoutId, exerciseId: ex.id, setId: set.id, weight: isNaN(v as number) ? null : v });
                  }}
                  placeholder="kg"
                  style={inputSx}
                />
              </td>
              <td style={{ ...cellSx, textAlign: 'center' }}>
                <input
                  type="number"
                  value={set.reps ?? ''}
                  onChange={(e) => {
                    const v = parseInt(e.target.value, 10);
                    if (!isNaN(v)) dispatch({ type: 'UPDATE_SET_REPS', planId, weekId, workoutId, exerciseId: ex.id, setId: set.id, reps: v });
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
        <td style={{ ...cellSx, textAlign: 'center', padding: '0 2px' }}>
          {!arrangeMode && (
            <IconButton
              size="small"
              sx={{ p: 0.25, opacity: 0.4, '&:hover': { opacity: 1 } }}
              onClick={(e) =>
                setMenuState({
                  anchor: e.currentTarget,
                  weekId,
                  workoutId,
                  exerciseId: ex.id,
                  exerciseIndex: exFullIndex,
                  exerciseCount,
                  isCardio: false,
                })
              }
              aria-label="Exercise options"
            >
              <MoreVertIcon sx={{ fontSize: '0.9rem' }} />
            </IconButton>
          )}
        </td>
      </tr>

      {/* Drop set rows */}
      {topLevelSets.map((parentSet) => {
        const children = dropsByParent.get(parentSet.id) ?? [];
        return children.map((dropSet, di) => {
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
                    <td style={{ ...cellSx, textAlign: 'center' }}>
                      <input
                        type="number"
                        value={dropSet.weight ?? ''}
                        onChange={(e) => {
                          const v = e.target.value === '' ? null : parseFloat(e.target.value);
                          dispatch({ type: 'UPDATE_SET_WEIGHT', planId, weekId, workoutId, exerciseId: ex.id, setId: dropSet.id, weight: isNaN(v as number) ? null : v });
                        }}
                        placeholder="kg"
                        style={inputSx}
                      />
                    </td>
                    <td style={{ ...cellSx, textAlign: 'center' }}>
                      <input
                        type="number"
                        value={dropSet.reps ?? ''}
                        onChange={(e) => {
                          const v = parseInt(e.target.value, 10);
                          if (!isNaN(v)) dispatch({ type: 'UPDATE_SET_REPS', planId, weekId, workoutId, exerciseId: ex.id, setId: dropSet.id, reps: v });
                        }}
                        placeholder="reps"
                        style={inputSx}
                      />
                    </td>
                  </React.Fragment>
                );
              })}
              <td style={{ ...cellSx }} />
              <td style={{ ...cellSx }} />
            </tr>
          );
        });
      })}
    </tbody>
  );
};

// ── SortableWorkoutSlot ───────────────────────────────────────────────────────

interface SortableWorkoutSlotProps {
  workout: WorkoutPrisma;
  planId: number;
  weekId: number;
  maxSets: number;
  dispatch: ActionDispatch<[WorkoutEditorAction]>;
  arrangeMode: boolean;
  openPicker: (weekId: number, workoutId: number) => void;
  openRenamePicker: (weekId: number, workoutId: number, workoutExerciseId: number) => void;
  setMenuState: (state: MenuState | null) => void;
  slotIdx: number;
}

const SortableWorkoutSlot = ({
  workout,
  planId,
  weekId,
  maxSets,
  dispatch,
  arrangeMode,
  openPicker,
  openRenamePicker,
  setMenuState,
  slotIdx,
}: SortableWorkoutSlotProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: 'wo-' + workout.id,
  });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
  );
  const activeSensors = arrangeMode ? sensors : [];

  const sortedExercises = [...workout.exercises].sort((a, b) => a.order - b.order);
  const resistanceExercises = sortedExercises.filter(ex => ex.exercise?.category !== 'cardio');
  const cardioExercises = sortedExercises.filter(ex => ex.exercise?.category === 'cardio');
  const totalCols = 5 + maxSets * 2;

  const handleExerciseDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const fromIdx = sortedExercises.findIndex(ex => 'ex-' + ex.id === String(active.id));
    const toIdx = sortedExercises.findIndex(ex => 'ex-' + ex.id === String(over.id));
    if (fromIdx < 0 || toIdx < 0) return;
    dispatch({ type: 'REORDER_EXERCISE', planId, weekId, workoutId: workout.id, fromIndex: fromIdx, toIndex: toIdx });
  };

  const slotStyle: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };

  return (
    <Box ref={setNodeRef} style={slotStyle} sx={{ flexShrink: 0 }}>
      {/* Workout name */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
        {arrangeMode && (
          <Box
            component="span"
            {...attributes}
            {...listeners}
            sx={{ cursor: 'grab', mr: 0.5, color: 'text.disabled', display: 'inline-flex', alignItems: 'center' }}
          >
            <DragHandleIcon sx={{ fontSize: '0.85rem' }} />
          </Box>
        )}
        <Typography variant="caption" sx={{ fontWeight: 700, fontSize: '0.72rem', color: 'text.primary', flex: 1 }}>
          {stripSuffix(workout.name ?? `Workout ${slotIdx + 1}`)}
        </Typography>
        {!arrangeMode && (
          <IconButton
            size="small"
            sx={{ p: 0.25, ml: 0.5, opacity: 0.35, '&:hover': { opacity: 1 } }}
            onClick={() => dispatch({ type: 'REMOVE_WORKOUT', planId, weekId, workoutId: workout.id })}
            aria-label="Delete workout"
          >
            <CloseIcon sx={{ fontSize: '0.8rem' }} />
          </IconButton>
        )}
      </Box>

      {/* Resistance table */}
      {(resistanceExercises.length > 0 || cardioExercises.length === 0) && (
        <DndContext sensors={activeSensors} collisionDetection={closestCenter} onDragEnd={handleExerciseDragEnd}>
          <table style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ ...headerCellSx, textAlign: 'left', minWidth: '9rem', maxWidth: '14rem' }}>Exercise</th>
                <th style={{ ...headerCellSx, minWidth: '3rem' }}>TGT</th>
                <th style={{ ...headerCellSx, minWidth: '3rem' }}>REST</th>
                {Array.from({ length: maxSets }, (_, si) => (
                  <React.Fragment key={si}>
                    <th style={{ ...headerCellSx }}>Weight</th>
                    <th style={{ ...headerCellSx }}>Reps</th>
                  </React.Fragment>
                ))}
                <th style={{ ...headerCellSx, minWidth: '3.5rem' }}>~e1RM</th>
                <th style={{ ...headerCellSx, width: '1.5rem' }} />
              </tr>
            </thead>
            <SortableContext items={resistanceExercises.map(ex => 'ex-' + ex.id)} strategy={verticalListSortingStrategy}>
              {resistanceExercises.length === 0 ? (
                <tbody>
                  <tr>
                    <td colSpan={totalCols} style={{ ...cellSx, color: 'var(--mui-palette-text-disabled, #bbb)', fontStyle: 'italic' }}>
                      No exercises
                    </td>
                  </tr>
                </tbody>
              ) : (
                resistanceExercises.map((ex) => {
                  let bestE1rm: number | null = null;
                  for (const s of ex.sets) {
                    const v = computeE1rm(s.weight, s.reps);
                    if (v != null && (bestE1rm == null || v > bestE1rm)) bestE1rm = v;
                  }
                  return (
                    <SortableExerciseTbody
                      key={ex.id}
                      ex={ex}
                      exFullIndex={sortedExercises.findIndex(s => s.id === ex.id)}
                      exerciseCount={sortedExercises.length}
                      maxSets={maxSets}
                      planId={planId}
                      weekId={weekId}
                      workoutId={workout.id}
                      dispatch={dispatch}
                      arrangeMode={arrangeMode}
                      openRenamePicker={openRenamePicker}
                      setMenuState={setMenuState}
                      bestE1rm={bestE1rm}
                    />
                  );
                })
              )}
            </SortableContext>
            {!arrangeMode && (
              <tbody>
                <tr>
                  <td colSpan={totalCols} style={{ padding: '4px 4px 0', borderBottom: 'none' }}>
                    <Box
                      onClick={() => openPicker(weekId, workout.id)}
                      aria-label="Add exercise"
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '1px dashed',
                        borderColor: 'divider',
                        borderRadius: 1,
                        cursor: 'pointer',
                        color: 'primary.main',
                        opacity: 0.35,
                        py: 0.5,
                        '&:hover': { opacity: 0.9 },
                        transition: 'opacity 0.15s',
                      }}
                    >
                      <AddIcon sx={{ fontSize: '1rem' }} />
                    </Box>
                  </td>
                </tr>
              </tbody>
            )}
          </table>
        </DndContext>
      )}

      {/* Cardio sub-table */}
      {cardioExercises.length > 0 && (
        <Box sx={{ mt: resistanceExercises.length > 0 ? 1 : 0 }}>
          <table style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ ...headerCellSx, textAlign: 'left', minWidth: '9rem', maxWidth: '14rem' }}>Cardio</th>
                <th style={{ ...headerCellSx, minWidth: '3.5rem' }}>Min</th>
                <th style={{ ...headerCellSx, minWidth: '3.5rem' }}>km</th>
                <th style={{ ...headerCellSx, minWidth: '4rem' }}>Resistance</th>
                <th style={{ ...headerCellSx, width: '1.5rem' }} />
              </tr>
            </thead>
            <tbody>
              {cardioExercises.map((ex) => (
                <tr key={ex.id}>
                  <td style={{ ...cellSx, textAlign: 'left', maxWidth: '14rem', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {!arrangeMode ? (
                      ex.exercise?.name ? (
                        <Box
                          component="span"
                          onClick={() => openRenamePicker(weekId, workout.id, ex.id)}
                          sx={{
                            display: 'inline-flex', alignItems: 'center', gap: 0.25,
                            cursor: 'pointer', fontWeight: 600, fontSize: '0.75rem',
                            borderBottom: '1px dashed', borderColor: 'divider',
                            '&:hover .edit-icon': { opacity: 1 },
                          }}
                        >
                          {ex.exercise.name}
                          <EditIcon className="edit-icon" sx={{ fontSize: '0.65rem', opacity: 0.35, transition: 'opacity 0.15s', flexShrink: 0 }} />
                        </Box>
                      ) : (
                        <Box
                          component="span"
                          onClick={() => openRenamePicker(weekId, workout.id, ex.id)}
                          aria-label="Add exercise"
                          sx={{
                            display: 'inline-flex', alignItems: 'center', gap: 0.25,
                            cursor: 'pointer', fontSize: '0.7rem', color: 'text.disabled',
                            border: '1px dashed', borderColor: 'divider', borderRadius: 0.5,
                            px: 0.5, py: 0.25,
                            '&:hover': { color: 'text.secondary', borderColor: 'text.secondary' },
                            transition: 'color 0.15s, border-color 0.15s',
                          }}
                        >
                          <EditIcon sx={{ fontSize: '0.65rem' }} />
                          Add exercise
                        </Box>
                      )
                    ) : (
                      <Box component="span" sx={{ fontWeight: 600, fontSize: '0.75rem' }}>
                        {ex.exercise?.name ?? ''}
                      </Box>
                    )}
                  </td>
                  {(['cardioDuration', 'cardioDistance', 'cardioResistance'] as const).map((field) => (
                    <td key={field} style={{ ...cellSx, textAlign: 'center' }}>
                      <input
                        type="number"
                        value={ex[field] ?? ''}
                        onChange={(e) => {
                          const v = e.target.value === '' ? null : parseFloat(e.target.value);
                          dispatch({ type: 'UPDATE_CARDIO_DATA', planId, weekId, workoutId: workout.id, exerciseId: ex.id, field, value: isNaN(v as number) ? null : v });
                        }}
                        placeholder="—"
                        style={{ ...inputSx, width: '4em' }}
                      />
                    </td>
                  ))}
                  <td style={{ ...cellSx, textAlign: 'center', padding: '0 2px' }}>
                    {!arrangeMode && (
                      <IconButton
                        size="small"
                        sx={{ p: 0.25, opacity: 0.4, '&:hover': { opacity: 1 } }}
                        onClick={(e) =>
                          setMenuState({
                            anchor: e.currentTarget,
                            weekId,
                            workoutId: workout.id,
                            exerciseId: ex.id,
                            exerciseIndex: sortedExercises.findIndex(s => s.id === ex.id),
                            exerciseCount: sortedExercises.length,
                            isCardio: true,
                          })
                        }
                        aria-label="Exercise options"
                      >
                        <MoreVertIcon sx={{ fontSize: '0.9rem' }} />
                      </IconButton>
                    )}
                  </td>
                </tr>
              ))}
              {!arrangeMode && (
                <tr>
                  <td colSpan={5} style={{ padding: '4px 4px 0', borderBottom: 'none' }}>
                    <Box
                      onClick={() => openPicker(weekId, workout.id)}
                      aria-label="Add exercise"
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '1px dashed',
                        borderColor: 'divider',
                        borderRadius: 1,
                        cursor: 'pointer',
                        color: 'primary.main',
                        opacity: 0.35,
                        py: 0.5,
                        '&:hover': { opacity: 0.9 },
                        transition: 'opacity 0.15s',
                      }}
                    >
                      <AddIcon sx={{ fontSize: '1rem' }} />
                    </Box>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Box>
      )}
    </Box>
  );
};

// ── WeekBlock ─────────────────────────────────────────────────────────────────

interface WeekBlockProps {
  week: WeekData;
  planId: number;
  maxWorkoutCount: number;
  slotMaxSets: number[];
  dispatch: ActionDispatch<[WorkoutEditorAction]>;
  arrangeMode: boolean;
  creationMode: boolean;
  showWeekHeaders: boolean;
  openPicker: (weekId: number, workoutId: number) => void;
  openRenamePicker: (weekId: number, workoutId: number, workoutExerciseId: number) => void;
  setMenuState: (state: MenuState | null) => void;
}

const WeekBlock = ({
  week,
  planId,
  maxWorkoutCount,
  slotMaxSets,
  dispatch,
  arrangeMode,
  creationMode,
  showWeekHeaders,
  openPicker,
  openRenamePicker,
  setMenuState,
}: WeekBlockProps) => {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
  );
  const activeSensors = arrangeMode ? sensors : [];

  const sortedWorkouts = [...week.workouts].sort((a, b) => a.order - b.order);

  const handleWorkoutDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const fromIdx = sortedWorkouts.findIndex(w => 'wo-' + w.id === String(active.id));
    const toIdx = sortedWorkouts.findIndex(w => 'wo-' + w.id === String(over.id));
    if (fromIdx < 0 || toIdx < 0) return;
    dispatch({ type: 'REORDER_WORKOUT', planId, weekId: week.id, fromIndex: fromIdx, toIndex: toIdx });
  };

  return (
    <Box sx={{ mb: 3 }}>
      {/* Week header — hidden in creation mode */}
      {(!creationMode || showWeekHeaders) && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            pb: 0.5,
            mb: 0.5,
            borderBottom: '2px solid',
            borderColor: 'divider',
            width: '100%',
          }}
        >
          <Typography
            variant="overline"
            sx={{
              fontWeight: 700,
              fontSize: '0.7rem',
              letterSpacing: '0.08em',
              color: 'text.secondary',
              lineHeight: 1.4,
            }}
          >
            Week {week.order}
          </Typography>
          <Box sx={{ flex: 1 }} />
          {!arrangeMode && (
            <IconButton
              size="small"
              sx={{ p: 0.25, opacity: 0.35, '&:hover': { opacity: 1 } }}
              onClick={() => dispatch({ type: 'REMOVE_WEEK', planId, weekId: week.id })}
              aria-label="Delete week"
            >
              <CloseIcon sx={{ fontSize: '0.85rem' }} />
            </IconButton>
          )}
        </Box>
      )}

      {/* Workout slots */}
      <DndContext sensors={activeSensors} collisionDetection={closestCenter} onDragEnd={handleWorkoutDragEnd}>
        <SortableContext items={sortedWorkouts.map(w => 'wo-' + w.id)} strategy={horizontalListSortingStrategy}>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
            {Array.from({ length: maxWorkoutCount }, (_, slotIdx) => {
              const workout = sortedWorkouts.find(w => w.order === slotIdx + 1) ?? null;
              const maxSets = slotMaxSets[slotIdx];
              if (!workout) {
                return <Box key={slotIdx} sx={{ minWidth: '200px' }} />;
              }
              return (
                <SortableWorkoutSlot
                  key={workout.id}
                  workout={workout}
                  planId={planId}
                  weekId={week.id}
                  maxSets={maxSets}
                  dispatch={dispatch}
                  arrangeMode={arrangeMode}
                  openPicker={openPicker}
                  openRenamePicker={openRenamePicker}
                  setMenuState={setMenuState}
                  slotIdx={slotIdx}
                />
              );
            })}
            {/* + Workout — ghost dashed column */}
            {!arrangeMode && (
              <Box
                sx={{
                  flexShrink: 0,
                  alignSelf: 'stretch',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px dashed',
                  borderColor: 'divider',
                  borderRadius: 1,
                  minWidth: '2.5rem',
                  cursor: 'pointer',
                  color: 'primary.main',
                  opacity: 0.35,
                  '&:hover': { opacity: 0.9 },
                  transition: 'opacity 0.15s',
                }}
                onClick={() => dispatch({ type: 'ADD_WORKOUT', planId, weekId: week.id })}
                aria-label="Add workout"
              >
                <AddIcon sx={{ fontSize: '1rem' }} />
              </Box>
            )}
          </Box>
        </SortableContext>
      </DndContext>
    </Box>
  );
};

// ── PlanSheetView ─────────────────────────────────────────────────────────────

const PlanSheetView = ({
  plan,
  planId,
  zoom,
  onZoomChange,
  arrangeMode,
  creationMode = false,
  showWeekHeaders = false,
}: PlanSheetViewProps) => {
  const { dispatch, allExercises } = useWorkoutEditorContext();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerTarget, setPickerTarget] = useState<{ weekId: number; workoutId: number } | null>(null);
  const [renameTarget, setRenameTarget] = useState<{ weekId: number; workoutId: number; workoutExerciseId: number } | null>(null);
  const [menuState, setMenuState] = useState<MenuState | null>(null);

  const openRenamePicker = useCallback((weekId: number, workoutId: number, workoutExerciseId: number) => {
    setRenameTarget({ weekId, workoutId, workoutExerciseId });
  }, []);

  // Refs for pinch-to-zoom — manipulate DOM directly to avoid re-render on every touchmove
  const scrollRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const zoomRef = useRef(zoom);
  const pinchRef = useRef<{ startDist: number; startZoom: number; midX: number; midY: number; contentX: number; contentY: number } | null>(null);

  // Keep zoomRef current so touch handlers always see latest value
  useEffect(() => { zoomRef.current = zoom; }, [zoom]);

  // Apply CSS zoom directly to inner element (bypasses React re-render during pinch)
  useEffect(() => {
    if (innerRef.current) innerRef.current.style.zoom = String(zoom);
  }, [zoom]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const getTouchDist = (touches: TouchList) =>
      Math.hypot(
        touches[0].clientX - touches[1].clientX,
        touches[0].clientY - touches[1].clientY,
      );

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        const container = scrollRef.current;
        if (!container) return;
        const rect = container.getBoundingClientRect();
        const startDist = getTouchDist(e.touches);
        const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2 - rect.left;
        const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2 - rect.top;
        const contentX = (midX + container.scrollLeft) / zoomRef.current;
        const contentY = (midY + container.scrollTop) / zoomRef.current;
        pinchRef.current = { startDist, startZoom: zoomRef.current, midX, midY, contentX, contentY };
      } else {
        pinchRef.current = null;
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length !== 2 || !pinchRef.current) return;
      e.preventDefault();
      const dist = getTouchDist(e.touches);
      const raw = pinchRef.current.startZoom * (dist / pinchRef.current.startDist);
      const clamped = Math.max(0.25, Math.min(1, raw));
      zoomRef.current = clamped;
      if (innerRef.current) innerRef.current.style.zoom = String(clamped);
      if (scrollRef.current) {
        const { midX, midY, contentX, contentY } = pinchRef.current;
        scrollRef.current.scrollLeft = contentX * clamped - midX;
        scrollRef.current.scrollTop = contentY * clamped - midY;
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2 && pinchRef.current) {
        onZoomChange(zoomRef.current);
        pinchRef.current = null;
      }
    };

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd, { passive: true });

    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
    };
  }, [onZoomChange]);

  const sortedWeeks = [...plan.weeks].sort((a, b) => a.order - b.order);
  const maxWorkoutCount = Math.max(0, ...sortedWeeks.map(w => w.workouts.length));

  const menuEx = menuState
    ? plan.weeks.find(w => w.id === menuState.weekId)
        ?.workouts.find(wo => wo.id === menuState.workoutId)
        ?.exercises.find(ex => ex.id === menuState.exerciseId)
    : null;
  const menuTopLevelSets = menuEx?.sets.filter(s => !s.isDropSet).sort((a, b) => a.order - b.order) ?? [];
  const menuDropSets = menuEx?.sets.filter(s => s.isDropSet).sort((a, b) => a.order - b.order) ?? [];

  const closeMenu = () => setMenuState(null);
  const openPicker = (weekId: number, workoutId: number) => {
    setPickerTarget({ weekId, workoutId });
    setPickerOpen(true);
  };

  if (maxWorkoutCount === 0) {
    return (
      <>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          No workouts yet.
        </Typography>
        <Box
          sx={{ mt: 1, cursor: 'pointer', display: 'inline-block' }}
          onClick={() => {
            const lastWeek = sortedWeeks[sortedWeeks.length - 1];
            if (lastWeek) dispatch({ type: 'DUPLICATE_WEEK', planId, weekId: lastWeek.id });
          }}
        >
          <Typography variant="caption" color="primary" sx={{ fontSize: '0.7rem', userSelect: 'none' }}>
            + Week
          </Typography>
        </Box>
      </>
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
    <>
      {/* Scroll container */}
      <Box
        ref={scrollRef}
        sx={{
          overflow: 'auto',
          touchAction: 'pan-x pan-y',
          height: 'calc(100dvh - 200px)',
        }}
      >
        {/* Inner content — zoom applied here via DOM ref during pinch, via sx otherwise */}
        <Box ref={innerRef} sx={{ width: 'max-content', zoom: zoom }}>
          {sortedWeeks.map((week) => (
            <WeekBlock
              key={week.id}
              week={week}
              planId={planId}
              maxWorkoutCount={maxWorkoutCount}
              slotMaxSets={slotMaxSets}
              dispatch={dispatch}
              arrangeMode={arrangeMode}
              creationMode={creationMode}
              showWeekHeaders={showWeekHeaders}
              openPicker={openPicker}
              openRenamePicker={openRenamePicker}
              setMenuState={setMenuState}
            />
          ))}

          {/* + Week */}
          {!arrangeMode && !creationMode && (
            <Box
              onClick={() => {
                const lastWeek = sortedWeeks[sortedWeeks.length - 1];
                if (lastWeek) dispatch({ type: 'DUPLICATE_WEEK', planId, weekId: lastWeek.id });
              }}
              aria-label="Add week"
              sx={{
                mt: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '2px dashed',
                borderColor: 'divider',
                borderRadius: 1,
                cursor: 'pointer',
                color: 'primary.main',
                opacity: 0.35,
                py: 1,
                minWidth: '8rem',
                '&:hover': { opacity: 0.9 },
                transition: 'opacity 0.15s',
              }}
            >
              <AddIcon sx={{ fontSize: '1rem' }} />
            </Box>
          )}
        </Box>
      </Box>

      {/* Exercise context menu */}
      <Menu
        anchorEl={menuState?.anchor ?? null}
        open={Boolean(menuState)}
        onClose={closeMenu}
        slotProps={{ paper: { sx: { minWidth: '10rem' } } }}
      >
        {!menuState?.isCardio && [
          <MenuItem
            key="add-set"
            dense
            onClick={() => {
              if (menuState) dispatch({ type: 'ADD_SET', planId, weekId: menuState.weekId, workoutId: menuState.workoutId, exerciseId: menuState.exerciseId });
              closeMenu();
            }}
          >
            Add set
          </MenuItem>,
          <MenuItem
            key="remove-set"
            dense
            disabled={menuTopLevelSets.length === 0}
            onClick={() => {
              if (menuState) dispatch({ type: 'REMOVE_SET', planId, weekId: menuState.weekId, workoutId: menuState.workoutId, exerciseId: menuState.exerciseId });
              closeMenu();
            }}
          >
            Remove set
          </MenuItem>,
          <Divider key="div1" />,
          <MenuItem
            key="add-drop"
            dense
            disabled={menuTopLevelSets.length === 0}
            onClick={() => {
              const parentSetId = menuTopLevelSets[menuTopLevelSets.length - 1]?.id;
              if (menuState && parentSetId != null) dispatch({ type: 'ADD_DROP_SET', planId, weekId: menuState.weekId, workoutId: menuState.workoutId, exerciseId: menuState.exerciseId, parentSetId });
              closeMenu();
            }}
          >
            Add drop set
          </MenuItem>,
          <MenuItem
            key="remove-drop"
            dense
            disabled={menuDropSets.length === 0}
            onClick={() => {
              const lastDrop = menuDropSets[menuDropSets.length - 1];
              if (menuState && lastDrop) dispatch({ type: 'REMOVE_DROP_SET', planId, weekId: menuState.weekId, workoutId: menuState.workoutId, exerciseId: menuState.exerciseId, setId: lastDrop.id });
              closeMenu();
            }}
          >
            Remove drop set
          </MenuItem>,
          <Divider key="div2" />,
          <MenuItem
            key="move-up"
            dense
            disabled={menuState?.exerciseIndex === 0}
            onClick={() => {
              if (menuState) dispatch({ type: 'MOVE_EXERCISE', planId, weekId: menuState.weekId, workoutId: menuState.workoutId, dir: Dir.UP, index: menuState.exerciseIndex });
              closeMenu();
            }}
          >
            Move up
          </MenuItem>,
          <MenuItem
            key="move-down"
            dense
            disabled={menuState?.exerciseIndex === (menuState?.exerciseCount ?? 1) - 1}
            onClick={() => {
              if (menuState) dispatch({ type: 'MOVE_EXERCISE', planId, weekId: menuState.weekId, workoutId: menuState.workoutId, dir: Dir.DOWN, index: menuState.exerciseIndex });
              closeMenu();
            }}
          >
            Move down
          </MenuItem>,
          <Divider key="div3" />,
        ]}
        <MenuItem
          dense
          sx={{ color: 'error.main' }}
          onClick={() => {
            if (menuState) dispatch({ type: 'REMOVE_EXERCISE', planId, weekId: menuState.weekId, workoutId: menuState.workoutId, exerciseId: menuState.exerciseId });
            closeMenu();
          }}
        >
          Delete exercise
        </MenuItem>
      </Menu>

      <ExercisePickerDialog
        open={pickerOpen}
        title="Add Exercise"
        onClose={() => setPickerOpen(false)}
        onSelect={(exercise) => {
          setPickerOpen(false);
          if (pickerTarget) {
            dispatch({ type: 'ADD_EXERCISE_WITH_SET_FOR_EXERCISE', planId, weekId: pickerTarget.weekId, workoutId: pickerTarget.workoutId, exercise });
          }
        }}
      />

      <ExercisePickerDialog
        open={renameTarget !== null}
        title="Change Exercise"
        onClose={() => setRenameTarget(null)}
        onSelect={(exercise) => {
          if (renameTarget) {
            dispatch({
              type: 'UPDATE_EXERCISE',
              planId,
              weekId: renameTarget.weekId,
              workoutId: renameTarget.workoutId,
              workoutExerciseId: renameTarget.workoutExerciseId,
              exerciseName: exercise.name,
              exercises: allExercises,
              category: exercise.category ?? 'resistance',
            });
          }
          setRenameTarget(null);
        }}
      />
    </>
  );
};

export default PlanSheetView;
