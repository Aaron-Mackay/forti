'use client';

import {useEffect, useRef, useState} from 'react';
import {
  Box,
  Button,
  Chip,
  Collapse,
  Container,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  TextField,
  Typography
} from '@mui/material';
import {Overlay} from '@/components/signal/overlay';
import {DatePicker} from '@mui/x-date-pickers';
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import PanoramaFishEyeIcon from '@mui/icons-material/PanoramaFishEye';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import InfoIcon from '@mui/icons-material/Info';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import {WorkoutPrisma} from '@/types/dataTypes';
import './exercisesListView.css'
import {useAppBar} from '@lib/providers/AppBarProvider';
import {HEIGHT_EXC_APPBAR} from '@/components/shell/CustomAppBar';
import AppBarStopwatch from "@/app/user/workout/AppBarStopwatch";
import ScrollEdgeFades from '@/components/shell/ScrollEdgeFades';
import {useScrollEdgeFades} from '@lib/hooks/useScrollEdgeFades';
import {groupWorkoutExercises} from './groupWorkoutExercises';
import { signalTokens } from '@lib/signal/tokens';

const gymPalette = signalTokens.surface.gym;

export default function ExercisesListView({
                                            workout,
                                            onEnter,
                                            onBack,
                                            onSelectExercise,
                                            onWorkoutNoteBlur,
                                            onCompleteWorkout,
                                            onAddExercise,
                                            onRemoveExercise,
                                            signalEnabled = false,
                                          }: {
  workout: WorkoutPrisma;
  onEnter?: () => void | Promise<void>;
  onBack: () => void;
  onSelectExercise: (exerciseId: number) => void;
  onWorkoutNoteBlur: (note: string) => void;
  onCompleteWorkout: (completed: boolean, date?: Date) => void;
  onAddExercise: () => void;
  onRemoveExercise?: (workoutExerciseId: number) => void;
  signalEnabled?: boolean;
}) {
  useAppBar({title: workout.name, showBack: true, onBack});
  useEffect(() => {
    onEnter?.();
  }, [onEnter]);
  const [notesOpen, setNotesOpen] = useState(false);
  const [noteValue, setNoteValue] = useState(workout.notes ?? '');

  const {scrollRef: listRef, handleScroll: handleListScroll, showStartFade, showEndFade} =
    useScrollEdgeFades<HTMLUListElement>({axis: 'y', threshold: 4});

  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [warnUnloggedOpen, setWarnUnloggedOpen] = useState(false);
  const [pickedDate, setPickedDate] = useState<Date | null>(null);
  const [pendingRemoveExerciseId, setPendingRemoveExerciseId] = useState<number | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didLongPress = useRef(false);

  const LONG_PRESS_MS = 600;

  const clearLongPress = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handleCompleteBtnPointerDown = () => {
    clearLongPress();
    didLongPress.current = false;
    longPressTimer.current = setTimeout(() => {
      didLongPress.current = true;
      setPickedDate(workout.dateCompleted ? new Date(workout.dateCompleted) : new Date());
      setDatePickerOpen(true);
    }, LONG_PRESS_MS);
  };

  const handleCompleteBtnClick = () => {
    if (didLongPress.current) {
      didLongPress.current = false;
      return;
    }
    if (!isCompleted && unloggedCount > 0) {
      setPickedDate(null);
      setWarnUnloggedOpen(true);
      return;
    }
    onCompleteWorkout(!isCompleted);
  };

  const hasNote = noteValue.trim().length > 0;
  const isCompleted = !!workout.dateCompleted;
  const unloggedCount = workout.exercises.reduce((count, ex) => {
    if (ex.exercise.category === 'cardio') return count;
    return count + ex.sets.filter(s => s.reps == null).length;
  }, 0);
  const completedDate = workout.dateCompleted
    ? new Date(workout.dateCompleted).toLocaleDateString(undefined, {month: 'short', day: 'numeric', year: 'numeric'})
    : null;
  const exerciseGroups = groupWorkoutExercises(workout.exercises);

  if (signalEnabled) {
    return (
      <>
        <div
          style={{
            height: HEIGHT_EXC_APPBAR,
            background: gymPalette.bg,
            color: gymPalette.ink,
            fontFamily: signalTokens.fontVar.body,
            display: 'flex',
            flexDirection: 'column',
            padding: '14px 16px 0',
          }}
        >
          <div style={{ fontFamily: signalTokens.fontVar.mono, fontSize: 11, color: gymPalette.inkLight, marginBottom: 4 }}>
            {workout.name}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ fontFamily: signalTokens.fontVar.cond, fontSize: 24, fontWeight: 700, letterSpacing: '-0.01em', lineHeight: 1 }}>
              Exercises
            </div>
            <button
              type="button"
              onClick={onAddExercise}
              aria-label="Add exercise"
              style={{
                background: 'transparent',
                border: `1px solid ${gymPalette.border}`,
                borderRadius: signalTokens.radii.card,
                color: gymPalette.inkMid,
                padding: '6px 12px',
                fontFamily: signalTokens.fontVar.mono,
                fontSize: 11,
                cursor: 'pointer',
              }}
            >
              + add
            </button>
          </div>

          <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', marginBottom: 12 }}>
            {exerciseGroups.map((group) => {
              const first = group.items[0];
              const allLogged = group.items.every(ex =>
                ex.exercise.category === 'cardio'
                  ? (ex.cardioDuration != null || ex.cardioDistance != null)
                  : ex.sets.some(s => s.reps != null)
              );
              return (
                <button
                  key={group.key}
                  type="button"
                  onClick={() => onSelectExercise(first.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    width: '100%',
                    background: gymPalette.surface,
                    border: `1px solid ${gymPalette.border}`,
                    borderRadius: signalTokens.radii.card,
                    padding: '12px 14px',
                    color: gymPalette.ink,
                    cursor: 'pointer',
                    textAlign: 'left',
                    marginBottom: 2,
                    gap: 12,
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: signalTokens.fontVar.body, fontSize: 14, fontWeight: 500, marginBottom: 2 }}>
                      {first.exercise.name}
                      {group.items.length > 1 && (
                        <span style={{ marginLeft: 6, fontFamily: signalTokens.fontVar.mono, fontSize: 11, color: gymPalette.inkLight }}>
                          +{group.items.length - 1} more
                        </span>
                      )}
                    </div>
                    {first.exercise.category !== 'cardio' && first.repRange && (
                      <div style={{ fontFamily: signalTokens.fontVar.mono, fontSize: 11, color: gymPalette.inkLight }}>
                        {first.repRange} reps{first.restTime ? ` · ${first.restTime}s rest` : ''}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 3, alignItems: 'center', flexShrink: 0 }}>
                    {first.exercise.category === 'cardio' ? (
                      <span style={{ fontFamily: signalTokens.fontVar.mono, fontSize: 11, color: allLogged ? signalTokens.signal.deep : gymPalette.inkLight }}>
                        {allLogged ? 'done' : 'log'}
                      </span>
                    ) : (
                      first.sets.map((set, si) => (
                        <span
                          key={si}
                          style={{
                            display: 'block',
                            width: set.isDropSet ? 7 : 9,
                            height: set.isDropSet ? 7 : 9,
                            borderRadius: '50%',
                            background: set.reps != null ? signalTokens.signal.deep : 'transparent',
                            border: `1.5px solid ${set.reps != null ? signalTokens.signal.deep : gymPalette.borderStrong}`,
                          }}
                        />
                      ))
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Notes toggle */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              cursor: 'pointer',
              marginBottom: notesOpen ? 8 : 12,
              color: notesOpen || hasNote ? signalTokens.signal.deep : gymPalette.inkLight,
            }}
            onClick={() => setNotesOpen(o => !o)}
          >
            <span style={{ fontFamily: signalTokens.fontVar.mono, fontSize: 11 }}>
              {notesOpen ? '▾' : '▸'} Workout notes
            </span>
          </div>
          {notesOpen && (
            <textarea
              rows={3}
              placeholder="Workout notes..."
              value={noteValue}
              onChange={e => setNoteValue(e.target.value)}
              onBlur={() => onWorkoutNoteBlur(noteValue)}
              style={{
                width: '100%',
                background: gymPalette.surface,
                border: `1px solid ${gymPalette.border}`,
                borderRadius: signalTokens.radii.card,
                color: gymPalette.ink,
                fontFamily: signalTokens.fontVar.body,
                fontSize: 14,
                padding: '10px 12px',
                resize: 'none',
                marginBottom: 12,
                boxSizing: 'border-box',
              }}
            />
          )}

          {/* Complete CTA */}
          <span
            onPointerDown={handleCompleteBtnPointerDown}
            onPointerUp={clearLongPress}
            onPointerLeave={clearLongPress}
            onPointerCancel={clearLongPress}
            style={{ display: 'block', marginBottom: 'max(16px, calc(16px + env(safe-area-inset-bottom)))' }}
          >
            <button
              type="button"
              onClick={handleCompleteBtnClick}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: signalTokens.radii.card,
                border: `1px solid ${isCompleted ? signalTokens.signal.deep : gymPalette.borderStrong}`,
                background: isCompleted ? signalTokens.signal.deep : 'transparent',
                color: isCompleted ? gymPalette.bg : gymPalette.inkMid,
                fontFamily: signalTokens.fontVar.body,
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {isCompleted ? `Completed ${completedDate}` : 'Mark as complete'}
            </button>
          </span>
        </div>

        {/* Dialogs preserved unchanged */}
        <Overlay
          open={datePickerOpen}
          onClose={() => setDatePickerOpen(false)}
          title="Complete workout"
          size="sm"
          primaryAction={{
            label: 'Complete',
            onClick: () => {
              setDatePickerOpen(false);
              if (!pickedDate) return;
              if (unloggedCount > 0) {
                setWarnUnloggedOpen(true);
              } else {
                onCompleteWorkout(true, pickedDate);
              }
            },
          }}
          ghostAction={{label: 'Cancel', onClick: () => setDatePickerOpen(false)}}
        >
          <Typography variant="body2" sx={{mb: 2, mt: 1}}>Select a completion date:</Typography>
          <DatePicker
            value={pickedDate}
            onChange={setPickedDate}
            disableFuture
          />
        </Overlay>
        <Overlay
          open={pendingRemoveExerciseId !== null}
          onClose={() => setPendingRemoveExerciseId(null)}
          title="Remove exercise?"
          accent
          size="sm"
          primaryAction={{
            label: 'Remove',
            onClick: () => {
              if (pendingRemoveExerciseId != null && onRemoveExercise) {
                onRemoveExercise(pendingRemoveExerciseId);
              }
              setPendingRemoveExerciseId(null);
            },
          }}
          ghostAction={{label: 'Cancel', onClick: () => setPendingRemoveExerciseId(null)}}
        >
          <Typography variant="body2" sx={{pt: 1, pb: 1}}>
            This will remove this added exercise block from the workout.
          </Typography>
        </Overlay>
        <Overlay
          open={warnUnloggedOpen}
          onClose={() => setWarnUnloggedOpen(false)}
          title="Unlogged sets"
          accent
          size="sm"
          primaryAction={{
            label: 'Complete',
            onClick: () => {
              setWarnUnloggedOpen(false);
              onCompleteWorkout(true, pickedDate ?? undefined);
            },
          }}
          ghostAction={{label: 'Cancel', onClick: () => setWarnUnloggedOpen(false)}}
        >
          <Typography variant="body2" sx={{pt: 1, pb: 1}}>
            {unloggedCount} {unloggedCount === 1 ? 'set was' : 'sets were'} unlogged. Complete anyway?
          </Typography>
        </Overlay>
        <AppBarStopwatch/>
      </>
    );
  }

  return (
    <Box sx={{
      height: HEIGHT_EXC_APPBAR,
      bgcolor: 'background.default',
      color: 'text.primary',
      display: 'flex',
      flexDirection: 'column',
    }}>
      <Container
        maxWidth="sm"
        sx={{
          pt: 2,
          pb: 'max(16px, calc(16px + env(safe-area-inset-bottom)))',
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          flex: 1
        }}
      >
        <Box sx={{display: 'flex', alignItems: 'center'}}>
          <Typography variant="subtitle1" sx={{flex: 1}}>
            Exercises
          </Typography>
          <IconButton size="small" onClick={onAddExercise} aria-label="Add exercise">
            <AddIcon fontSize="small"/>
          </IconButton>
        </Box>
        <Box sx={{position: 'relative', flex: 1, minHeight: 0}}>
          <List
            ref={listRef}
            className={"maskedOverflow"}
            onScroll={() => handleListScroll()}
            sx={{
              flex: 1,
              height: '100%',
              minHeight: 0,
              py: 0,
              overflowY: 'auto',
            }}
          >
            {exerciseGroups.map((group) => {
              const first = group.items[0];
              const groupHasSubstituted = group.items.some(item => item.substitutedForId != null);
              const groupHasAdded = group.items.some(item => item.isAdded);
              return (
                <ListItem
                  key={group.key}
                  disablePadding
                  sx={{
                    borderLeft: groupHasSubstituted ? '3px solid' : groupHasAdded ? '3px solid' : 'none',
                    borderColor: groupHasSubstituted ? 'warning.main' : 'info.main',
                    display: 'flex',
                    alignItems: 'stretch',
                  }}
                >
                  <ListItemButton onClick={() => onSelectExercise(first.id)} sx={{flex: 1, alignItems: 'flex-start'}}>
                    <Box sx={{flex: 1, minWidth: 0}}>
                      <Box sx={{display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap'}}>
                        <Typography variant="body2" sx={{fontWeight: 500}}>
                          {first.exercise.name}
                        </Typography>
                      </Box>
                      {group.items.map((ex, idx) => {
                        const isSubstituted = ex.substitutedForId != null;
                        const isAdded = ex.isAdded;
                        return (
                          <Box key={ex.id} sx={{mt: idx === 0 ? 0.25 : 1}}>
                            <Box sx={{display: 'flex', alignItems: 'center', mt: 0.25}}>
                              {ex.exercise.category === 'cardio' ? (
                                ex.cardioDuration != null || ex.cardioDistance != null ? (
                                  <Typography variant="caption" color="text.secondary">
                                    {[
                                      ex.cardioDuration != null ? `${ex.cardioDuration} min` : null,
                                      ex.cardioDistance != null ? `${ex.cardioDistance} km` : null,
                                    ].filter(Boolean).join(' · ')}
                                  </Typography>
                                ) : (
                                  <PanoramaFishEyeIcon sx={{fontSize: '1.1rem', color: 'text.secondary'}}/>
                                )
                              ) : (
                                <Box sx={{display: 'flex', alignItems: 'center', gap: 1, width: '100%', minWidth: 0}}>
                                  <Typography variant="caption" color="text.secondary">
                                    {ex.repRange ? `${ex.repRange.replaceAll('-', ' - ')} reps` : null}
                                  </Typography>
                                  {ex.restTime && ex.repRange && '·'}
                                  <Typography variant="caption" color="text.secondary">
                                    {ex.restTime ? `${ex.restTime.endsWith('s') ? ex.restTime : `${ex.restTime}s`} rest` : null}
                                  </Typography>
                                  {(ex.isBfr || isSubstituted || isAdded) && '·'}
                                  {ex.isBfr && (
                                    <Chip label="BFR" size="small" color="warning"
                                          sx={{height: 18, fontSize: '0.65rem'}}/>
                                  )}
                                  {isSubstituted && (
                                    <Chip
                                      label="Sub"
                                      size="small"
                                      color="warning"
                                      variant="outlined"
                                      title={ex.substitutedFor ? `Originally: ${ex.substitutedFor.name}` : undefined}
                                      sx={{height: 18, fontSize: '0.65rem'}}
                                    />
                                  )}
                                  {isAdded && (
                                    <Chip label="Added" size="small" color="info" variant="outlined"
                                          sx={{height: 18, fontSize: '0.65rem'}}/>
                                  )}
                                  <Box sx={{flex: 1}}/>
                                  <Box
                                    sx={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: 0.5,
                                    }}
                                  >
                                    <Box sx={{display: 'flex', alignItems: 'center'}}>
                                      {ex.sets.map((set, setIdx) => {
                                        const iconSx = set.isDropSet
                                          ? {fontSize: '0.85rem'}
                                          : {fontSize: '1.1rem'};

                                        return set.reps ? (
                                          <TaskAltIcon key={setIdx} sx={iconSx}/>
                                        ) : (
                                          <PanoramaFishEyeIcon key={setIdx} sx={iconSx}/>
                                        );
                                      })}
                                    </Box>

                                    {isAdded && onRemoveExercise ? (
                                      <IconButton
                                        size="small"
                                        color="error"
                                        aria-label={`Remove exercise block ${idx + 1}`}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setPendingRemoveExerciseId(ex.id);
                                        }}
                                      >
                                        <DeleteOutlineIcon fontSize="small"/>
                                      </IconButton>
                                    ) : <Box sx={{height: 30, width: 30}}/>}
                                  </Box>
                                </Box>
                              )}
                            </Box>
                            {isSubstituted && ex.substitutedFor && (
                              <Typography variant="caption" color="warning.main" sx={{display: 'block', mt: 0.25}}>
                                Originally: {ex.substitutedFor.name}
                              </Typography>
                            )}
                          </Box>
                        );
                      })}
                    </Box>
                  </ListItemButton>
                </ListItem>
              );
            })}
          </List>
          <ScrollEdgeFades axis="y" showStart={showStartFade} showEnd={showEndFade} size={40} background="default"/>
        </Box>
        <Box
          sx={{display: 'flex', alignItems: 'center', cursor: 'pointer', mb: 1}}
          onClick={() => setNotesOpen(o => !o)}
        >
          <IconButton size="small" color={notesOpen || hasNote ? 'primary' : 'default'} sx={{mr: 0.5}}>
            {notesOpen || hasNote ? <InfoIcon fontSize="small"/> : <InfoOutlinedIcon fontSize="small"/>}
          </IconButton>
          <Typography variant="caption" color={notesOpen || hasNote ? 'primary' : 'text.secondary'}>
            Workout notes
          </Typography>
        </Box>
        <Collapse in={notesOpen}>
          <TextField
            multiline
            fullWidth
            minRows={2}
            maxRows={5}
            placeholder="Workout notes..."
            value={noteValue}
            onChange={e => setNoteValue(e.target.value)}
            onBlur={() => onWorkoutNoteBlur(noteValue)}
            size="small"
            sx={{mb: 1}}
          />
        </Collapse>
        <span
          onPointerDown={handleCompleteBtnPointerDown}
          onPointerUp={clearLongPress}
          onPointerLeave={clearLongPress}
          onPointerCancel={clearLongPress}
          style={{display: 'block', marginBottom: 8}}
        >
          <Button
            variant={isCompleted ? 'contained' : 'outlined'}
            color="success"
            fullWidth
            onClick={handleCompleteBtnClick}
            startIcon={isCompleted ? <CheckCircleIcon/> : <CheckCircleOutlineIcon/>}
          >
            {isCompleted ? `Completed ${completedDate}` : 'Mark as Complete'}
          </Button>
        </span>
        <Overlay
          open={datePickerOpen}
          onClose={() => setDatePickerOpen(false)}
          title="Complete workout"
          size="sm"
          primaryAction={{
            label: 'Complete',
            onClick: () => {
              setDatePickerOpen(false);
              if (!pickedDate) return;
              if (unloggedCount > 0) {
                setWarnUnloggedOpen(true);
              } else {
                onCompleteWorkout(true, pickedDate);
              }
            },
          }}
          ghostAction={{label: 'Cancel', onClick: () => setDatePickerOpen(false)}}
        >
          <Typography variant="body2" sx={{mb: 2, mt: 1}}>Select a completion date:</Typography>
          <DatePicker
            value={pickedDate}
            onChange={setPickedDate}
            disableFuture
          />
        </Overlay>
        <Overlay
          open={pendingRemoveExerciseId !== null}
          onClose={() => setPendingRemoveExerciseId(null)}
          title="Remove exercise?"
          accent
          size="sm"
          primaryAction={{
            label: 'Remove',
            onClick: () => {
              if (pendingRemoveExerciseId != null && onRemoveExercise) {
                onRemoveExercise(pendingRemoveExerciseId);
              }
              setPendingRemoveExerciseId(null);
            },
          }}
          ghostAction={{label: 'Cancel', onClick: () => setPendingRemoveExerciseId(null)}}
        >
          <Typography variant="body2" sx={{pt: 1, pb: 1}}>
            This will remove this added exercise block from the workout.
          </Typography>
        </Overlay>
        <Overlay
          open={warnUnloggedOpen}
          onClose={() => setWarnUnloggedOpen(false)}
          title="Unlogged sets"
          accent
          size="sm"
          primaryAction={{
            label: 'Complete',
            onClick: () => {
              setWarnUnloggedOpen(false);
              onCompleteWorkout(true, pickedDate ?? undefined);
            },
          }}
          ghostAction={{label: 'Cancel', onClick: () => setWarnUnloggedOpen(false)}}
        >
          <Typography variant="body2" sx={{pt: 1, pb: 1}}>
            {unloggedCount} {unloggedCount === 1 ? 'set was' : 'sets were'} unlogged. Complete anyway?
          </Typography>
        </Overlay>
        <AppBarStopwatch/>
      </Container>
    </Box>
  );
}
