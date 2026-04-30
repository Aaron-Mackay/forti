'use client';

import {useState} from 'react';
import {Box, Chip, Collapse, IconButton, Menu, MenuItem, Paper, TextField, Typography,} from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import InfoIcon from '@mui/icons-material/Info';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import MuscleHighlight from '@/components/fitness/MuscleHighlight';
import type {UserExerciseNote} from '@/generated/prisma/browser';
import type {E1rmHistoryPoint, PreviousExerciseHistory} from '@lib/contracts/exerciseHistory';
import type {WorkoutExerciseGroup} from './groupWorkoutExercises';
import {useSettings} from '@lib/providers/SettingsProvider';
import WorkoutExerciseSetSection from './WorkoutExerciseSetSection';
import E1rmHistorySection from './E1rmHistorySection';
import PreviousWorkoutsSection from './PreviousWorkoutsSection';
import CardioInputsSection from './CardioInputsSection';
import {getGroupBestE1rm, getHistoricalBest, hasAnyE1rmHistory} from './exerciseHistoryUtils';

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
  const [formCueOpen, setFormCueOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const [menuExerciseId, setMenuExerciseId] = useState<number | null>(null);

  const first = group.items[0];
  const formCue = editValue ?? userExerciseNote?.note ?? '';
  const hasFormCue = formCue.trim().length > 0;

  const bestE1rm = getGroupBestE1rm(group.items);
  const historicalBest = getHistoricalBest(history);
  const hasPreviousHistory = hasAnyE1rmHistory(history);
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
        <Typography variant="h6">{first.exercise.name}</Typography>
      </Box>

      <Box sx={{display: 'flex', alignItems: 'stretch', justifyContent: 'space-between', mb: 1}}>
        <Box sx={{minWidth: 0, pr: 1}}>
          <Box
            sx={{display: 'flex', alignItems: 'center', cursor: 'pointer', mt: 0.25}}
            onClick={() => setFormCueOpen(o => !o)}
          >
            <IconButton size="small" color={formCueOpen || hasFormCue ? 'primary' : 'default'} sx={{mr: 0.5}}>
              {formCueOpen ? <InfoIcon fontSize="small"/> : <InfoOutlinedIcon fontSize="small"/>}
            </IconButton>
            <Typography variant="caption" color={formCueOpen || hasFormCue ? 'primary' : 'text.secondary'}>
              Notes
            </Typography>
          </Box>
        </Box>
        <Box sx={{
          alignSelf: 'stretch',
          flex: '0 0 auto',
          width: 'auto',
        }}>
          <MuscleHighlight
            primaryMuscles={first.exercise.primaryMuscles}
            secondaryMuscles={first.exercise.secondaryMuscles}
            exerciseId={first.exerciseId}
            filterByQuadrants
          />
        </Box>
      </Box>

      <Collapse in={formCueOpen} sx={{width: '100%'}}>
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
        />
      </Collapse>

      <E1rmHistorySection
        exerciseId={group.exerciseId}
        history={history}
        todayE1RM={bestE1rm}
        historyOpen={historyOpen}
        onToggle={() => setHistoryOpen(o => !o)}
        highlight={hasPreviousHistory}
      />

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
                  Rest: {item.restTime ?? '—'}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Reps: {item.repRange ?? '—'}
                </Typography>
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

        {firstBlockPreviousWorkouts.length > 0 ? (
          <PreviousWorkoutsSection
            blocks={[{history: {workouts: firstBlockPreviousWorkouts}}]}
            weightUnit={effectiveUnit === 'none' ? 'kg' : effectiveUnit}
          />
        ) : null}
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
          Substitute exercise
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
