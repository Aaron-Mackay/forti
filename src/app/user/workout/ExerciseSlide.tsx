'use client';

import {useState} from 'react';
import {
  Box,
  Button,
  Chip,
  Collapse,
  IconButton,
  Menu,
  MenuItem,
  Paper,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import MuscleHighlight from '@/components/fitness/MuscleHighlight';
import PlateCalculatorSheet from './PlateCalculatorSheet';
import {formatWeight} from '@/lib/units';
import type {ExerciseUnitOverride} from '@/types/settingsTypes';
import {WorkoutExercisePrisma} from '@/types/dataTypes';
import {UserExerciseNote} from '@/generated/prisma/browser';
import type {E1rmHistoryPoint, PreviousExerciseHistory} from '@lib/contracts/exerciseHistory';
import {useSettings} from '@lib/providers/SettingsProvider';
import ScrollEdgeFades from '@/components/shell/ScrollEdgeFades';
import {useScrollEdgeFades} from '@lib/hooks/useScrollEdgeFades';
import WorkoutExerciseSetSection from './WorkoutExerciseSetSection';
import E1rmHistorySection from './E1rmHistorySection';
import PreviousWorkoutsSection from './PreviousWorkoutsSection';
import {
  getHistoricalBest,
  getTodayBestE1rm,
} from './exerciseHistoryUtils';
import {AnimatePresence, motion} from 'framer-motion';

export default function ExerciseSlide({
                                        ex,
                                        userExerciseNote,
                                        onFormCueBlur,
                                        handleSetUpdate,
                                        handleEffortUpdate,
                                        previousWorkout,
                                        history,
                                        onSubstitute,
                                      }: {
  ex: WorkoutExercisePrisma;
  userExerciseNote: UserExerciseNote | undefined;
  onFormCueBlur: (exerciseId: number, note: string) => void;
  handleSetUpdate: (workoutExerciseId: number, setIdx: number, field: 'weight' | 'reps', value: string) => void;
  handleEffortUpdate: (workoutExerciseId: number, setId: number, field: 'rpe' | 'rir', value: number | null) => void;
  previousWorkout: PreviousExerciseHistory | undefined;
  history: E1rmHistoryPoint[] | null;
  onSubstitute?: () => void;
}) {
  const {settings, setExerciseUnitOverride} = useSettings();
  const override = settings.exerciseUnitOverrides[String(ex.exerciseId)] ?? null;
  const effectiveUnit = override ?? settings.weightUnit;

  // null = not editing; drives value from prop so duplicate-exercise slides stay in sync
  const [editValue, setEditValue] = useState<string | null>(null);
  const [activePanel, setActivePanel] = useState<'notes' | 'e1rm' | null>(null);

  const formCue = editValue ?? userExerciseNote?.note ?? '';
  const [warmupOpen, setWarmupOpen] = useState(false);
  const [plateCalcOpen, setPlateCalcOpen] = useState(false);
  const [plateCalcSetIdx, setPlateCalcSetIdx] = useState<number | null>(null);
  const [unitMenuAnchor, setUnitMenuAnchor] = useState<HTMLElement | null>(null);
  const [exerciseMenuAnchor, setExerciseMenuAnchor] = useState<HTMLElement | null>(null);
  const {scrollRef, handleScroll: handleListScroll, showStartFade, showEndFade} =
    useScrollEdgeFades<HTMLDivElement>({axis: 'y', threshold: 4});

  const isBarbell = ex.exercise.equipment?.includes('barbell') ?? false;

  // Derive working weight: first entered set weight, else first previous set weight
  const workingWeight =
    ex.sets.find(s => s.weight != null)?.weight ??
    previousWorkout?.workouts.find(workout => workout.sets.some(s => s.weight != null))?.sets.find(s => s.weight != null)?.weight ??
    null;

  const WARMUP_STEPS = [
    {pct: 0.5, reps: 10},
    {pct: 0.6, reps: 5},
    {pct: 0.75, reps: 3},
    {pct: 0.85, reps: 1},
  ];

  const warmupSets = workingWeight
    ? WARMUP_STEPS.map(({pct, reps}) => ({
      weightKg: Math.round((workingWeight * pct) / 2.5) * 2.5,
      reps,
      pct: Math.round(pct * 100),
    }))
    : null;

  const previousWorkouts = previousWorkout?.workouts ?? [];
  const hasPreviousWorkout = previousWorkouts.length > 0;
  const todayBestE1rm = getTodayBestE1rm(ex);
  const historicalBest = getHistoricalBest(history);

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
        alignItems: 'center',
        border: '1px solid',
        borderColor: 'divider',
      }}
    >
      {/* Header row: name/rest/reps/notes toggle on left, anatomy on right */}
      <Box sx={{display: 'flex', width: "100%", justifyContent: 'space-between', alignItems: 'flex-start'}}>
        <Box>
          <Typography variant="h6">
            {ex.exercise.name}
          </Typography>
        </Box>
        {onSubstitute && (
          <IconButton
            size="small"
            onClick={(e) => setExerciseMenuAnchor(e.currentTarget)}
            aria-label="Exercise menu"
            title="Exercise menu"
          >
            <MoreVertIcon fontSize="small"/>
          </IconButton>
        )}
      </Box>
      <Box sx={{display: 'flex', alignItems: 'stretch', width: '100%', mb: 1, justifyContent: 'space-between', gap: 1}}>
        <Box sx={{flex: '1 1 auto', minWidth: 0}}>
          <Box sx={{display: 'flex', alignItems: 'center', gap: 0.5}}>
            {ex.isBfr && (
              <Chip
                label="BFR"
                size="small"
                color="warning"
                sx={{height: 18, fontSize: '0.7rem', flexShrink: 0}}
              />
            )}

          </Box>
          {ex.isAdded && !ex.substitutedFor && (
            <Typography variant="caption" color="info.main" sx={{display: 'block', mb: 0.5}}>
              Added during workout
            </Typography>
          )}
          {ex.substitutedFor && (
            <Typography variant="caption" color="warning.main" sx={{display: 'block', mb: 0.5}}>
              Originally: {ex.substitutedFor.name}
            </Typography>
          )}
          <Typography variant="subtitle1" gutterBottom noWrap>
            Rest: {ex.restTime}s
          </Typography>
          <Typography variant="subtitle1" gutterBottom noWrap>
            Reps: {ex.repRange}
          </Typography>
          {ex.targetRpe != null && (
            <Typography variant="subtitle1" gutterBottom noWrap>
              Target: RPE {ex.targetRpe}
            </Typography>
          )}
          {ex.targetRir != null && (
            <Typography variant="subtitle1" gutterBottom noWrap>
              Target: {ex.targetRir} RIR
            </Typography>
          )}
          <Tabs
            value={activePanel ?? false}
            onChange={() => {}}
            variant="fullWidth"
            sx={{mt: 0.5, minHeight: 32, '& .MuiTab-root': {minHeight: 32, py: 0.5, whiteSpace: 'nowrap'}}}
          >
            <Tab
              value="notes"
              label="Notes"
              onClick={() => setActivePanel(curr => (curr === 'notes' ? null : 'notes'))}
              sx={{fontSize: '0.6rem', textTransform: 'none'}}
            />
            <Tab
              value="e1rm"
              label="Progress"
              onClick={() => setActivePanel(curr => (curr === 'e1rm' ? null : 'e1rm'))}
              sx={{fontSize: '0.6rem', textTransform: 'none'}}
            />
          </Tabs>
        </Box>
        <Box
          sx={{
            flex: '0 1 auto',
            width: 'auto',
            maxWidth: '48%',
            minWidth: 0,
            height: '100%',
            alignSelf: 'stretch',
            overflow: 'hidden',
          }}
        >
          <MuscleHighlight
            primaryMuscles={ex.exercise.primaryMuscles}
            secondaryMuscles={ex.exercise.secondaryMuscles}
            exerciseId={ex.exerciseId}
            filterByQuadrants
          />
        </Box>
      </Box>

      <AnimatePresence initial={false}>
        {activePanel && (
          <Box
            key={activePanel}
            component={motion.div}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{
              duration: 0.18,
              ease: 'easeOut',
            }}
            sx={{
              width: '100%',
              overflow: 'hidden',
              mb: 1,
            }}
          >
            {activePanel === 'notes' && (
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
                  onFormCueBlur(ex.exerciseId, formCue);
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
            )}

            {activePanel === 'e1rm' && (
              <Box>
                <E1rmHistorySection
                  exerciseId={ex.exerciseId}
                  history={history}
                  todayE1RM={todayBestE1rm}
                />
              </Box>
            )}
          </Box>
        )}
      </AnimatePresence>

      {/* Warmup suggestions — hidden for 'no unit' machines and when setting is off */}
      <Box sx={{
        width: '100%',
        mb: 1,
        display: (effectiveUnit === 'none' || !settings.showWarmupSuggestions) ? 'none' : undefined
      }}>
        <Button
          size="small"
          variant="outlined"
          startIcon={<FitnessCenterIcon fontSize="small"/>}
          onClick={() => setWarmupOpen(o => !o)}
          sx={{mb: 0.5}}
        >
          {warmupOpen ? 'Hide warmup sets' : 'Suggest warmup sets'}
        </Button>
        <Collapse in={warmupOpen}>
          {warmupSets ? (
            <Table size="small" sx={{'& td, & th': {py: 0.25, px: 0.75}}}>
              <TableBody>
                {warmupSets.map(({weightKg, reps, pct}) => (
                  <TableRow key={pct}>
                    <TableCell sx={{color: 'text.secondary', width: 40}}>{pct}%</TableCell>
                    <TableCell
                      sx={{fontWeight: 500}}>{formatWeight(weightKg, effectiveUnit === 'none' ? 'kg' : effectiveUnit)}</TableCell>
                    <TableCell sx={{color: 'text.secondary'}}>× {reps} {reps === 1 ? 'rep' : 'reps'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <Typography variant="caption" color="text.secondary" sx={{pl: 0.5}}>
              Enter a weight in your first set (or complete a previous session) to see warmup suggestions.
            </Typography>
          )}
        </Collapse>
      </Box>

      <Box sx={{position: 'relative', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column'}}>
        <Box ref={scrollRef} onScroll={() => handleListScroll()}
             sx={{flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden', width: '100%'}}>
          <WorkoutExerciseSetSection
            ex={ex}
            effectiveUnit={effectiveUnit}
            isBarbell={isBarbell}
            showPlateCalculator={settings.showPlateCalculator}
            effortMetric={settings.effortMetric}
            todayBestE1rm={todayBestE1rm}
            historicalBest={historicalBest}
            handleSetUpdate={handleSetUpdate}
            handleEffortUpdate={handleEffortUpdate}
            onOpenUnitMenu={(el) => setUnitMenuAnchor(el)}
            onOpenPlateCalc={(setIdx) => {
              setPlateCalcSetIdx(setIdx);
              setPlateCalcOpen(true);
            }}
          />

          {hasPreviousWorkout ? (
            <PreviousWorkoutsSection
              blocks={[{history: {workouts: previousWorkouts}}]}
              weightUnit={effectiveUnit === 'none' ? 'kg' : effectiveUnit}
            />
          ) : null}
        </Box>
        <ScrollEdgeFades axis="y" showStart={showStartFade} showEnd={showEndFade} size={48} background="paper"/>
      </Box>

      {/* Unit override context menu — opened by long-pressing a weight field */}
      <Menu
        anchorEl={exerciseMenuAnchor}
        open={Boolean(exerciseMenuAnchor)}
        onClose={() => setExerciseMenuAnchor(null)}
      >
        <MenuItem
          onClick={() => {
            setExerciseMenuAnchor(null);
            onSubstitute?.();
          }}
        >
          {ex.isAdded ? 'Replace exercise' : 'Substitute exercise'}
        </MenuItem>
      </Menu>

      <Menu
        anchorEl={unitMenuAnchor}
        open={Boolean(unitMenuAnchor)}
        onClose={() => setUnitMenuAnchor(null)}
      >
        {(
          [
            {value: null, label: `Default (${settings.weightUnit})`},
            {value: 'kg' as ExerciseUnitOverride, label: 'Force kg'},
            {value: 'lbs' as ExerciseUnitOverride, label: 'Force lbs'},
            {value: 'none' as ExerciseUnitOverride, label: 'No unit (machine)'},
          ] as { value: ExerciseUnitOverride | null; label: string }[]
        ).map(({value, label}) => (
          <MenuItem
            key={String(value)}
            onClick={() => {
              setExerciseUnitOverride(ex.exerciseId, value);
              setUnitMenuAnchor(null);
            }}
          >
            <Box sx={{display: 'flex', alignItems: 'center', gap: 1, minWidth: 180}}>
              <Box sx={{width: 20}}>
                {override === value && <CheckIcon fontSize="small" color="primary"/>}
              </Box>
              {label}
            </Box>
          </MenuItem>
        ))}
      </Menu>

      {/* Plate calculator bottom sheet */}
      {plateCalcOpen && (
        <PlateCalculatorSheet
          initialKg={plateCalcSetIdx !== null ? (ex.sets[plateCalcSetIdx]?.weight ?? null) : null}
          unit={effectiveUnit === 'none' ? 'kg' : effectiveUnit}
          onClose={() => setPlateCalcOpen(false)}
          onUseWeight={(kg) => {
            if (plateCalcSetIdx !== null) handleSetUpdate(ex.id, plateCalcSetIdx, 'weight', kg.toString());
          }}
        />
      )}
    </Paper>
  );
}
