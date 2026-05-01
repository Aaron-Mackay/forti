'use client';

import {useState} from 'react';
import {Box, Chip, IconButton, Menu, MenuItem, Paper, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography,} from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import MuscleHighlight from '@/components/fitness/MuscleHighlight';
import type {UserExerciseNote} from '@/generated/prisma/browser';
import type {E1rmHistoryPoint, PreviousExerciseHistory} from '@lib/contracts/exerciseHistory';
import type {WorkoutExerciseGroup} from './groupWorkoutExercises';
import {useSettings} from '@lib/providers/SettingsProvider';
import WorkoutExerciseSetSection from './WorkoutExerciseSetSection';
import E1rmHistorySection from './E1rmHistorySection';
import CardioInputsSection from './CardioInputsSection';
import {getGroupBestE1rm, getHistoricalBest} from './exerciseHistoryUtils';
import {formatWeight, kgToDisplay} from '@/lib/units';
import WorkoutSlidePanels, {type WorkoutSlidePanelKey} from './_components/WorkoutSlidePanels';

type Props = {
  group: WorkoutExerciseGroup;
  userExerciseNote: UserExerciseNote | undefined;
  onFormCueBlur: (exerciseId: number, note: string) => void;
  handleSetUpdate: (workoutExerciseId: number, setIdx: number, field: 'weight' | 'reps', value: string) => void;
  handleEffortUpdate: (workoutExerciseId: number, setId: number, field: 'rpe' | 'rir', value: number | null) => void;
  history: E1rmHistoryPoint[] | null;
  previousSetsMap: Map<number, PreviousExerciseHistory>;
  onSubstituteExercise: (workoutExerciseId: number) => void;
  onRemoveExercise: (workoutExerciseId: number) => void;
  onCardioUpdate: (workoutExerciseId: number, field: 'cardioDuration' | 'cardioDistance' | 'cardioResistance', value: number | null) => void;
};

export default function GroupedExerciseSlide({
                                               group,
                                               userExerciseNote,
                                               onFormCueBlur,
                                               handleSetUpdate,
                                               handleEffortUpdate,
                                               history,
                                               previousSetsMap,
                                               onSubstituteExercise,
                                               onRemoveExercise,
                                               onCardioUpdate,
                                             }: Props) {
  const {settings} = useSettings();
  const override = settings.exerciseUnitOverrides[String(group.exerciseId)] ?? null;
  const effectiveUnit = override ?? settings.weightUnit;
  const [editValue, setEditValue] = useState<string | null>(null);
  const [activePanel, setActivePanel] = useState<WorkoutSlidePanelKey | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const [menuExerciseId, setMenuExerciseId] = useState<number | null>(null);

  const first = group.items[0];
  const formCue = editValue ?? userExerciseNote?.note ?? '';

  const bestE1rm = getGroupBestE1rm(group.items);
  const historicalBest = getHistoricalBest(history);
  const firstBlock = group.items[0];
  const firstBlockPreviousWorkouts = previousSetsMap.get(firstBlock.id)?.workouts ?? [];

  return (
    <Paper
      elevation={1}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        minHeight: 0,
        maxWidth: '100%',
        mx: 1,
        boxSizing: 'border-box',
        p: 2,
        border: '1px solid',
        borderColor: 'divider',
      }}
    >

      <Box sx={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start'}}>
        <Typography
          variant="h6"
          sx={{fontSize: 'clamp(15px, 5vw, 20px)'}}>
          {first.exercise.name}
        </Typography>
      </Box>
      <Box sx={{overflowY: 'auto', minHeight: 0, flex: 1}}>
        {group.items.map((item, idx) => {
          const effortMetric = settings.effortMetric;
          const initialSetCount = group.items
            .slice(0, idx)
            .reduce((sum, prior) => sum + prior.sets.filter(set => !set.isDropSet).length, 0);
          return (
            <Box key={item.id}>
              <Box sx={{display: 'flex', alignItems: 'center', gap: 1}}>
                <Typography variant="caption" color="text.secondary">
                  Rest: {item.restTime ?? '—'}s
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Reps: {item.repRange ?? '—'}
                </Typography>
                {item.targetRpe != null && (
                  <Typography variant="caption" gutterBottom noWrap>
                    Target: RPE {item.targetRpe}
                  </Typography>
                )}
                {item.targetRir != null && (
                  <Typography variant="caption" gutterBottom noWrap>
                    Target: {item.targetRir} RIR
                  </Typography>
                )}
                {item.isBfr && <Chip label="BFR" size="small" color="warning" sx={{height: 18, fontSize: '0.65rem'}}/>}
                {item.isAdded && <Chip label="Added" size="small" color="info" variant="outlined"
                                       sx={{height: 18, fontSize: '0.65rem'}}/>}
                {item.substitutedForId != null && (
                  <Chip label="Sub" size="small" color="warning" variant="outlined"
                        sx={{height: 18, fontSize: '0.65rem'}}/>
                )}
                <Box sx={{flex: 1}}/>
                <IconButton
                  size="small"
                  onClick={(e) => {
                    setMenuExerciseId(item.id);
                    setMenuAnchor(e.currentTarget);
                  }}
                  aria-label={`Exercise block ${idx + 1} menu`}
                >
                  <MoreVertIcon fontSize="small"/>
                </IconButton>
              </Box>


              {item.exercise.category === 'cardio' ? (
                <CardioInputsSection
                  ex={item}
                  onCardioUpdate={(field, value) => onCardioUpdate(item.id, field, value)}
                  mt={0}
                />
              ) : (
                <WorkoutExerciseSetSection
                  ex={item}
                  effectiveUnit={(settings.exerciseUnitOverrides[String(item.exerciseId)] ?? settings.weightUnit)}
                  isBarbell={item.exercise.equipment?.includes('barbell') ?? false}
                  showPlateCalculator={settings.showPlateCalculator}
                  effortMetric={effortMetric}
                  todayBestE1rm={bestE1rm}
                  historicalBest={historicalBest}
                  handleSetUpdate={handleSetUpdate}
                  handleEffortUpdate={handleEffortUpdate}
                  onOpenUnitMenu={(el) => {
                    void el;
                  }}
                  onOpenPlateCalc={(setIdx) => {
                    void setIdx;
                  }}
                  showHeaders={idx === 0}
                  initialSetCount={initialSetCount}
                />
              )}
            </Box>
          );
        })}

        <WorkoutSlidePanels
          activePanel={activePanel}
          onActivePanelChange={setActivePanel}
          panels={[
            {
              value: 'notes',
              label: 'Notes',
              render: () => (
                <TextField
                  multiline
                  fullWidth
                  minRows={2}
                  maxRows={4}
                  placeholder="Add form cues and notes for this exercise..."
                  value={formCue}
                  onChange={e => setEditValue(e.target.value)}
                  onFocus={() => setEditValue(formCue)}
                  onBlur={() => {
                    onFormCueBlur(group.exerciseId, formCue);
                    setEditValue(null);
                  }}
                  size="small"
                  sx={{
                    mt: 0.75,
                    '& .MuiInputBase-input': {
                      fontSize: '0.875rem',
                    },
                  }}
                />
              ),
            },
            {
              value: 'e1rm',
              label: 'Progress',
              render: () => (
                <Box>
                  <E1rmHistorySection
                    exerciseId={group.exerciseId}
                    history={history}
                    todayE1RM={bestE1rm}
                  />
                </Box>
              ),
            },
            {
              value: 'muscles',
              label: 'Muscles',
              render: () => (
                <Box sx={{width: '100%', overflow: 'hidden', mb: 1}}>
                  <Box
                    sx={{
                      width: '100%',
                      maxWidth: 240,
                      aspectRatio: '2 / 1',
                      mx: 'auto',
                    }}
                  >
                    <MuscleHighlight
                      primaryMuscles={first.exercise.primaryMuscles}
                      secondaryMuscles={first.exercise.secondaryMuscles}
                      exerciseId={first.exerciseId}
                      filterByQuadrants
                    />
                  </Box>
                </Box>
              ),
            },
            {
              value: 'history',
              label: 'History',
              render: () => (
                <Box sx={{width: '100%', overflow: 'hidden', mb: 1}}>
                  {firstBlockPreviousWorkouts.length > 0 ? (
                    <Box sx={{width: '100%'}}>
                      <Box sx={{mb: 0}}>
                        {firstBlockPreviousWorkouts.map((workout, workoutIdx) => (
                          <Box key={`${workout.completedAt}-${workoutIdx}`} sx={{mb: workoutIdx === firstBlockPreviousWorkouts.length - 1 ? 0 : 1.5}}>
                            {workout.completedAt ? (
                              <Typography variant="caption" color="text.secondary" sx={{display: 'block', mb: 0.75}}>
                                {new Date(workout.completedAt).toLocaleDateString(undefined, {month: 'short', day: 'numeric', year: 'numeric'})}
                                {workout.workoutName ? ` · ${workout.workoutName}` : ''}
                              </Typography>
                            ) : null}
                            <Table
                              size="small"
                              aria-label={`Previous workout table ${workoutIdx + 1}`}
                              sx={{'& td, & th': {py: 0.5, px: 0.75}}}
                            >
                              <TableHead>
                                <TableRow>
                                  <TableCell align="center">Set</TableCell>
                                  <TableCell align="center">Weight</TableCell>
                                  <TableCell align="center">Reps</TableCell>
                                  <TableCell align="center">Est. 1RM</TableCell>
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {workout.sets.map(set => (
                                  <TableRow key={set.order}>
                                    <TableCell align="center">{set.order}</TableCell>
                                    <TableCell align="center">{formatWeight(set.weight, effectiveUnit === 'none' ? 'kg' : effectiveUnit)}</TableCell>
                                    <TableCell align="center">{set.reps ?? '—'}</TableCell>
                                    <TableCell align="center">{set.e1rm == null ? '—' : (kgToDisplay(set.e1rm, effectiveUnit === 'none' ? 'kg' : effectiveUnit) ?? set.e1rm).toFixed(1)}</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </Box>
                        ))}
                      </Box>
                    </Box>
                  ) : (
                    <Box
                      sx={{
                        height: 80,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '1px dashed',
                        borderColor: 'divider',
                        borderRadius: 1,
                      }}
                    >
                      <Typography variant="caption" color="text.disabled">
                        No previous workouts yet
                      </Typography>
                    </Box>
                  )}
                </Box>
              ),
            },
          ]}
        />
      </Box>
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={() => {
          setMenuAnchor(null);
          setMenuExerciseId(null);
        }}
      >
        <MenuItem
          onClick={() => {
            if (menuExerciseId != null) onSubstituteExercise(menuExerciseId);
            setMenuAnchor(null);
            setMenuExerciseId(null);
          }}
        >
          {group.items.find(i => i.id === menuExerciseId)?.isAdded ? 'Replace exercise' : 'Substitute exercise'}
        </MenuItem>
        {group.items.find(i => i.id === menuExerciseId)?.isAdded && (
          <MenuItem
            onClick={() => {
              if (menuExerciseId != null) onRemoveExercise(menuExerciseId);
              setMenuAnchor(null);
              setMenuExerciseId(null);
            }}
          >
            Remove exercise
          </MenuItem>
        )}
      </Menu>
    </Paper>
  );
}
