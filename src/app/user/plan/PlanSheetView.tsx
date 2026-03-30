'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Box, Divider, IconButton, Menu, MenuItem, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import { PlanPrisma } from '@/types/dataTypes';
import { useWorkoutEditorContext } from '@/context/WorkoutEditorContext';
import { computeE1rm } from '@lib/e1rm';
import ExercisePickerDialog from '@/app/user/workout/ExercisePickerDialog';

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

const addRowSx: React.CSSProperties = {
  padding: '3px 6px',
  fontSize: '0.7rem',
  whiteSpace: 'nowrap',
  verticalAlign: 'middle',
  textAlign: 'center',
  cursor: 'pointer',
  color: 'var(--mui-palette-primary-main)',
  userSelect: 'none',
  borderBottom: '1px solid var(--mui-palette-divider, #e0e0e0)',
};

const HIGHLIGHT = 'rgba(255,193,7,0.2)';

interface MenuState {
  anchor: HTMLElement;
  weekId: number;
  workoutId: number;
  exerciseId: number;
  isCardio: boolean;
}

interface PlanSheetViewProps {
  plan: PlanPrisma;
  planId: number;
  zoom: number;
  onZoomChange: (zoom: number) => void;
}

const PlanSheetView = ({ plan, planId, zoom, onZoomChange }: PlanSheetViewProps) => {
  const { dispatch } = useWorkoutEditorContext();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerTarget, setPickerTarget] = useState<{ weekId: number; workoutId: number } | null>(null);
  const [menuState, setMenuState] = useState<MenuState | null>(null);

  // Refs for pinch-to-zoom — manipulate DOM directly to avoid re-render on every touchmove
  const scrollRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const zoomRef = useRef(zoom);
  const pinchRef = useRef<{ startDist: number; startZoom: number } | null>(null);

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
        pinchRef.current = { startDist: getTouchDist(e.touches), startZoom: zoomRef.current };
      } else {
        pinchRef.current = null;
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length !== 2 || !pinchRef.current) return;
      e.preventDefault(); // block page zoom / scroll during pinch
      const dist = getTouchDist(e.touches);
      const raw = pinchRef.current.startZoom * (dist / pinchRef.current.startDist);
      const clamped = Math.max(0.25, Math.min(1, raw));
      zoomRef.current = clamped;
      if (innerRef.current) innerRef.current.style.zoom = String(clamped);
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2 && pinchRef.current) {
        // Commit final zoom to state + localStorage on finger lift
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

  // Live exercise lookup for menu — always reflects current plan state
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
      {/* Scroll container — fills remaining viewport height so swiping anywhere scrolls */}
      <Box
        ref={scrollRef}
        sx={{
          overflowX: 'auto',
          overflowY: 'visible',
          touchAction: 'pan-x pan-y',
          minHeight: 'calc(100dvh - 200px)',
        }}
      >
        {/* Inner content — zoom applied here via DOM ref during pinch, via sx otherwise */}
        <Box ref={innerRef} sx={{ width: 'max-content', zoom: zoom }}>
          {sortedWeeks.map((week) => {
            const sortedWorkouts = [...week.workouts].sort((a, b) => a.order - b.order);

            return (
              <Box key={week.id} sx={{ mb: 3 }}>
                {/* Week label row with delete × */}
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
                  <IconButton
                    size="small"
                    sx={{ p: 0.25, opacity: 0.35, '&:hover': { opacity: 1 } }}
                    onClick={() => dispatch({ type: 'REMOVE_WEEK', planId, weekId: week.id })}
                    aria-label="Delete week"
                  >
                    <CloseIcon sx={{ fontSize: '0.85rem' }} />
                  </IconButton>
                </Box>

                {/* Workout slot columns + add workout */}
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                  {Array.from({ length: maxWorkoutCount }, (_, slotIdx) => {
                    const workout = sortedWorkouts.find(w => w.order === slotIdx + 1) ?? null;
                    const maxSets = slotMaxSets[slotIdx];
                    // columns: Exercise + TGT + REST + (Weight+Reps)*maxSets + ~e1RM + ⋮
                    const totalCols = 5 + maxSets * 2;

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
                        {/* Workout name with delete × */}
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                          <Typography
                            variant="caption"
                            sx={{
                              fontWeight: 700,
                              fontSize: '0.72rem',
                              color: 'text.primary',
                              flex: 1,
                            }}
                          >
                            {stripSuffix(workout.name ?? `Workout ${slotIdx + 1}`)}
                          </Typography>
                          <IconButton
                            size="small"
                            sx={{ p: 0.25, ml: 0.5, opacity: 0.35, '&:hover': { opacity: 1 } }}
                            onClick={() => dispatch({ type: 'REMOVE_WORKOUT', planId, weekId: week.id, workoutId: workout.id })}
                            aria-label="Delete workout"
                          >
                            <CloseIcon sx={{ fontSize: '0.8rem' }} />
                          </IconButton>
                        </Box>

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
                                <th style={{ ...headerCellSx, width: '1.5rem' }} />
                              </tr>
                            </thead>
                            <tbody>
                              {resistanceExercises.length === 0 ? (
                                <tr>
                                  <td colSpan={totalCols} style={{ ...cellSx, color: 'var(--mui-palette-text-disabled, #bbb)', fontStyle: 'italic' }}>
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

                                  const dropsByParent = new Map<number, typeof dropSets>();
                                  for (const ds of dropSets) {
                                    if (ds.parentSetId == null) continue;
                                    if (!dropsByParent.has(ds.parentSetId)) dropsByParent.set(ds.parentSetId, []);
                                    dropsByParent.get(ds.parentSetId)!.push(ds);
                                  }

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
                                          const hl = set.id === bestSetId ? { background: HIGHLIGHT } : {};
                                          return (
                                            <React.Fragment key={si}>
                                              <td style={{ ...cellSx, textAlign: 'center', ...hl }}>
                                                <input
                                                  type="number"
                                                  value={set.weight ?? ''}
                                                  onChange={(e) => {
                                                    const v = e.target.value === '' ? null : parseFloat(e.target.value);
                                                    dispatch({ type: 'UPDATE_SET_WEIGHT', planId, weekId: week.id, workoutId: workout.id, exerciseId: ex.id, setId: set.id, weight: isNaN(v as number) ? null : v });
                                                  }}
                                                  placeholder="kg"
                                                  style={inputSx}
                                                />
                                              </td>
                                              <td style={{ ...cellSx, textAlign: 'center', ...hl }}>
                                                <input
                                                  type="number"
                                                  value={set.reps ?? ''}
                                                  onChange={(e) => {
                                                    const v = parseInt(e.target.value, 10);
                                                    if (!isNaN(v)) dispatch({ type: 'UPDATE_SET_REPS', planId, weekId: week.id, workoutId: workout.id, exerciseId: ex.id, setId: set.id, reps: v });
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
                                          <IconButton
                                            size="small"
                                            sx={{ p: 0.25, opacity: 0.4, '&:hover': { opacity: 1 } }}
                                            onClick={(e) => setMenuState({ anchor: e.currentTarget, weekId: week.id, workoutId: workout.id, exerciseId: ex.id, isCardio: false })}
                                            aria-label="Exercise options"
                                          >
                                            <MoreVertIcon sx={{ fontSize: '0.9rem' }} />
                                          </IconButton>
                                        </td>
                                      </tr>

                                      {/* Drop set rows */}
                                      {topLevelSets.map((parentSet, _si) => {
                                        const children = dropsByParent.get(parentSet.id) ?? [];
                                        return children.map((dropSet, di) => {
                                          const hl = dropSet.id === bestSetId ? { background: HIGHLIGHT } : {};
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
                                                    <td style={{ ...cellSx, textAlign: 'center', ...hl }}>
                                                      <input type="number" value={dropSet.weight ?? ''} onChange={(e) => { const v = e.target.value === '' ? null : parseFloat(e.target.value); dispatch({ type: 'UPDATE_SET_WEIGHT', planId, weekId: week.id, workoutId: workout.id, exerciseId: ex.id, setId: dropSet.id, weight: isNaN(v as number) ? null : v }); }} placeholder="kg" style={inputSx} />
                                                    </td>
                                                    <td style={{ ...cellSx, textAlign: 'center', ...hl }}>
                                                      <input type="number" value={dropSet.reps ?? ''} onChange={(e) => { const v = parseInt(e.target.value, 10); if (!isNaN(v)) dispatch({ type: 'UPDATE_SET_REPS', planId, weekId: week.id, workoutId: workout.id, exerciseId: ex.id, setId: dropSet.id, reps: v }); }} placeholder="reps" style={inputSx} />
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
                                    </React.Fragment>
                                  );
                                })
                              )}

                              {/* + Exercise row */}
                              <tr>
                                <td
                                  colSpan={totalCols}
                                  style={{ ...addRowSx, borderTop: '1px dashed var(--mui-palette-divider, #e0e0e0)', borderBottom: 'none' }}
                                  onClick={() => openPicker(week.id, workout.id)}
                                >
                                  + Exercise
                                </td>
                              </tr>
                            </tbody>
                          </table>
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
                                      <span style={{ fontWeight: 600, fontSize: '0.75rem' }}>{ex.exercise?.name ?? '(unnamed)'}</span>
                                    </td>
                                    {(['cardioDuration', 'cardioDistance', 'cardioResistance'] as const).map((field) => (
                                      <td key={field} style={{ ...cellSx, textAlign: 'center' }}>
                                        <input
                                          type="number"
                                          value={ex[field] ?? ''}
                                          onChange={(e) => {
                                            const v = e.target.value === '' ? null : parseFloat(e.target.value);
                                            dispatch({ type: 'UPDATE_CARDIO_DATA', planId, weekId: week.id, workoutId: workout.id, exerciseId: ex.id, field, value: isNaN(v as number) ? null : v });
                                          }}
                                          placeholder="—"
                                          style={{ ...inputSx, width: '4em' }}
                                        />
                                      </td>
                                    ))}
                                    <td style={{ ...cellSx, textAlign: 'center', padding: '0 2px' }}>
                                      <IconButton
                                        size="small"
                                        sx={{ p: 0.25, opacity: 0.4, '&:hover': { opacity: 1 } }}
                                        onClick={(e) => setMenuState({ anchor: e.currentTarget, weekId: week.id, workoutId: workout.id, exerciseId: ex.id, isCardio: true })}
                                        aria-label="Exercise options"
                                      >
                                        <MoreVertIcon sx={{ fontSize: '0.9rem' }} />
                                      </IconButton>
                                    </td>
                                  </tr>
                                ))}
                                <tr>
                                  <td
                                    colSpan={5}
                                    style={{ ...addRowSx, borderTop: '1px dashed var(--mui-palette-divider, #e0e0e0)', borderBottom: 'none' }}
                                    onClick={() => openPicker(week.id, workout.id)}
                                  >
                                    + Exercise
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                          </Box>
                        )}
                      </Box>
                    );
                  })}

                  {/* + Workout */}
                  <Box
                    sx={{ flexShrink: 0, display: 'flex', alignItems: 'flex-start', pl: 1, pt: '2px', cursor: 'pointer' }}
                    onClick={() => dispatch({ type: 'ADD_WORKOUT', planId, weekId: week.id })}
                  >
                    <Typography variant="caption" color="primary" sx={{ fontSize: '0.7rem', userSelect: 'none' }}>
                      + Workout
                    </Typography>
                  </Box>
                </Box>
              </Box>
            );
          })}

          {/* + Week */}
          <Box
            sx={{ mt: 1, pb: 1, borderTop: '1px dashed', borderColor: 'divider', pt: 1, cursor: 'pointer', display: 'inline-block' }}
            onClick={() => {
              const lastWeek = sortedWeeks[sortedWeeks.length - 1];
              if (lastWeek) dispatch({ type: 'DUPLICATE_WEEK', planId, weekId: lastWeek.id });
            }}
          >
            <Typography variant="caption" color="primary" sx={{ fontSize: '0.7rem', userSelect: 'none' }}>
              + Week
            </Typography>
          </Box>
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
    </>
  );
};

export default PlanSheetView;
