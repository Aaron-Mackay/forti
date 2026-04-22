'use client';

import {useState} from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Chip,
  Collapse,
  IconButton,
  List,
  ListItem,
  Menu,
  MenuItem,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import InfoIcon from '@mui/icons-material/Info';
import CheckIcon from '@mui/icons-material/Check';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter';
import CalculateOutlinedIcon from '@mui/icons-material/CalculateOutlined';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import MuscleHighlight from '@/components/MuscleHighlight';
import E1rmSparkline from './E1rmSparkline';
import WeightInput from './WeightInput';
import PlateCalculatorSheet from './PlateCalculatorSheet';
import {computeE1rm} from '@/lib/e1rm';
import {formatWeight, kgToDisplay} from '@/lib/units';
import type {ExerciseUnitOverride} from '@/types/settingsTypes';
import {SetPrisma, WorkoutExercisePrisma} from '@/types/dataTypes';
import {UserExerciseNote} from '@/generated/prisma/browser';
import type {E1rmHistoryPoint} from '@lib/contracts/exerciseHistory';
import {useSettings} from '@lib/providers/SettingsProvider';
import type {PreviousExerciseHistory} from '@lib/contracts/exerciseHistory';
import ScrollEdgeFades from '@/components/ScrollEdgeFades';
import { useScrollEdgeFades } from '@lib/hooks/useScrollEdgeFades';

function formatCompletedDate(value: string | null): string | null {
  if (!value) return null;
  return new Date(value).toLocaleDateString(undefined, {month: 'short', day: 'numeric', year: 'numeric'});
}

const RPE_VALUES = [6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10];
const RIR_VALUES = [0, 1, 2, 3, 4];

function EffortChipRow({
                         metric,
                         value,
                         onSelect,
                       }: {
  metric: 'rpe' | 'rir';
  value: number | null;
  onSelect: (v: number | null) => void;
}) {
  const values = metric === 'rpe' ? RPE_VALUES : RIR_VALUES;
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 0.75,
        overflowX: 'auto',
        py: 0.5,
        pl: 0.5,
        // hide scrollbar but keep scroll functionality
        scrollbarWidth: 'none',
        '&::-webkit-scrollbar': {display: 'none'},
      }}
    >
      <Typography variant="caption" color="text.secondary" sx={{flex: 'none', fontWeight: 600, minWidth: 28}}>
        {metric.toUpperCase()}
      </Typography>
      {values.map(v => (
        <Chip
          key={v}
          label={v}
          size="small"
          variant={value === v ? 'filled' : 'outlined'}
          color={value === v ? 'primary' : 'default'}
          onClick={() => onSelect(value === v ? null : v)}
          sx={{flex: 'none', minWidth: 40}}
        />
      ))}
    </Box>
  );
}

type SetGroup = { parent: SetPrisma; drops: SetPrisma[] };

function groupSets(sets: SetPrisma[]): SetGroup[] {
  const regular = [...sets].filter(s => !s.isDropSet).sort((a, b) => a.order - b.order);
  return regular.map(parent => ({
    parent,
    drops: sets
      .filter(s => s.isDropSet && s.parentSetId === parent.id)
      .sort((a, b) => a.order - b.order),
  }));
}

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
  handleSetUpdate: (setIdx: number, field: 'weight' | 'reps', value: string) => void;
  handleEffortUpdate: (setId: number, field: 'rpe' | 'rir', value: number | null) => void;
  previousWorkout: PreviousExerciseHistory | undefined;
  history: E1rmHistoryPoint[] | null;
  onSubstitute?: () => void;
}) {
  const {settings, setExerciseUnitOverride} = useSettings();
  const override = settings.exerciseUnitOverrides[String(ex.exerciseId)] ?? null;
  const effectiveUnit = override ?? settings.weightUnit;

  // null = not editing; drives value from prop so duplicate-exercise slides stay in sync
  const [editValue, setEditValue] = useState<string | null>(null);
  const [formCueOpen, setFormCueOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  const formCue = editValue ?? userExerciseNote?.note ?? '';
  const [warmupOpen, setWarmupOpen] = useState(false);
  const [plateCalcOpen, setPlateCalcOpen] = useState(false);
  const [plateCalcSetIdx, setPlateCalcSetIdx] = useState<number | null>(null);
  const [unitMenuAnchor, setUnitMenuAnchor] = useState<HTMLElement | null>(null);
  const [exerciseMenuAnchor, setExerciseMenuAnchor] = useState<HTMLElement | null>(null);
  const { scrollRef, handleScroll: handleListScroll, showStartFade, showEndFade } =
    useScrollEdgeFades<HTMLDivElement>({ axis: 'y', threshold: 4 });

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

  const hasFormCue = formCue.trim().length > 0;
  const previousWorkouts = previousWorkout?.workouts ?? [];
  const hasPreviousWorkout = previousWorkouts.length > 0;
  const validHistory = history?.filter(p => typeof p.bestE1rm === 'number') ?? [];

  const todayBestE1rm = ex.sets
    .filter(s => !s.isDropSet)
    .reduce<number | null>((best, set) => {
      const e = computeE1rm(set.weight, set.reps);
      return e === null ? best : best === null ? e : Math.max(best, e);
    }, null);

  const historicalBest = history && history.length > 0
    ? Math.max(...history.map(p => p.bestE1rm))
    : null;

  const isNewBest = todayBestE1rm !== null && historicalBest !== null
    && todayBestE1rm > historicalBest;
  const displayBest = todayBestE1rm !== null || historicalBest !== null
    ? Math.max(todayBestE1rm || 0, historicalBest || 0)
    : null;
  const hasGraphableHistory = validHistory.length > 1;

  const groups = groupSets(ex.sets);

  return (
    <Paper
      elevation={1}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        minHeight: 0,
        maxWidth: '100',
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
          {ex.substitutedFor && (
            <Typography variant="caption" color="warning.main" sx={{display: 'block', mb: 0.5}}>
              Originally: {ex.substitutedFor.name}
            </Typography>
          )}
          {ex.isAdded && !ex.substitutedFor && (
            <Typography variant="caption" color="info.main" sx={{display: 'block', mb: 0.5}}>
              Added during workout
            </Typography>
          )}
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
      <Box sx={{display: 'flex', alignItems: 'stretch', width: '100%', mb: 1}}>
        <Box sx={{flex: 1}}>
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
          <Typography variant="subtitle1" gutterBottom>
            Rest: {ex.restTime}
          </Typography>
          <Typography variant="subtitle1" gutterBottom>
            Reps: {ex.repRange}
          </Typography>
          {ex.targetRpe != null && (
            <Typography variant="subtitle1" gutterBottom>
              Target: RPE {ex.targetRpe}
            </Typography>
          )}
          {ex.targetRir != null && (
            <Typography variant="subtitle1" gutterBottom>
              Target: {ex.targetRir} RIR
            </Typography>
          )}
          <Box
            sx={{display: 'flex', alignItems: 'center', cursor: 'pointer', mt: 0.5}}
            onClick={() => setFormCueOpen(o => !o)}
          >
            <IconButton size="small" color={formCueOpen ? 'primary' : 'default'} sx={{mr: 0.5}}>
              {formCueOpen ? <InfoIcon fontSize="small"/> : <InfoOutlinedIcon fontSize="small"/>}
            </IconButton>
            <Typography variant="caption" color={formCueOpen || hasFormCue ? 'primary' : 'text.secondary'}>
              Your exercise notes
            </Typography>
          </Box>
        </Box>
        <MuscleHighlight
          primaryMuscles={ex.exercise.primaryMuscles}
          secondaryMuscles={ex.exercise.secondaryMuscles}
          exerciseId={ex.exerciseId}
          filterByQuadrants
        />
      </Box>

      {/* Form cue textarea */}
      <Collapse in={formCueOpen} sx={{width: '100%', mb: 1}}>
        <TextField
          multiline
          fullWidth
          minRows={2}
          maxRows={4}
          placeholder="Add form cues and notes for this exercise..."
          value={formCue}
          onChange={e => setEditValue(e.target.value)}
          onFocus={() => setEditValue(formCue)}
          onBlur={() => { onFormCueBlur(ex.exerciseId, formCue); setEditValue(null); }}
          size="small"
          sx={{mt: 0.5}}
        />
      </Collapse>

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
        <Box ref={scrollRef} onScroll={() => handleListScroll()} sx={{flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden', width: '100%'}}>
          {ex.sets.length > 0 && (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                width: '100%',
                gap: 1,
                px: 1,
                pb: 0.5,
                boxSizing: 'border-box',
              }}
            >
              <Box sx={{width: 36, flex: 'none'}}>
                <Typography variant="caption" color="text.secondary" sx={{display: 'block', textAlign: 'center'}}>Set</Typography>
              </Box>
              <Box sx={{flex: '1 1 0', minWidth: 0}}>
                <Typography variant="caption" color="text.secondary" sx={{display: 'block', textAlign: 'center'}}>
                  Weight
                </Typography>
              </Box>
              <Box sx={{flex: '1 1 0', minWidth: 0}}>
                <Typography variant="caption" color="text.secondary" sx={{display: 'block', textAlign: 'center'}}>Reps</Typography>
              </Box>
              <Box sx={{flex: '1 1 0', minWidth: 0}}>
                <Typography variant="caption" color="text.secondary" sx={{display: 'block', textAlign: 'center'}}>Est. 1RM</Typography>
              </Box>
            </Box>
          )}
          <List sx={{width: '100%', overflowX: 'hidden'}}>
            {ex.sets.length === 0 && (
              <Typography variant="body2" color="text.secondary" sx={{mt: 1}}>
                No sets recorded.
              </Typography>
            )}
            {groups.map((group, groupIdx) => {
              const parentSetIdx = ex.sets.findIndex(s => s.id === group.parent.id);
              const liveE1rm = computeE1rm(group.parent.weight, group.parent.reps);

              return (
                <Box key={group.parent.id}>
                  {/* Parent (regular) set row */}
                  <ListItem disablePadding sx={{alignItems: 'center', mb: 0.5, flexDirection: 'column'}}>
                    <Box sx={{display: 'flex', alignItems: 'center', width: '100%', gap: 1, overflowX: 'hidden'}}>
                      <Box sx={{flex: 'none', mr: 1}}>
                        <Box sx={{display: 'flex', alignItems: 'center'}}>
                          <Box
                            sx={{
                              width: 28, height: 28, borderRadius: '50%',
                              bgcolor: 'action.selected',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}
                          >
                            <Typography variant="caption" fontWeight={600}>{groupIdx + 1}</Typography>
                          </Box>
                          {isBarbell && effectiveUnit !== 'none' && settings.showPlateCalculator && (
                            <IconButton
                              size="small"
                              aria-label="Open plate calculator"
                              onClick={() => {
                                setPlateCalcSetIdx(parentSetIdx);
                                setPlateCalcOpen(true);
                              }}
                              sx={{p: 0.25}}
                            >
                              <CalculateOutlinedIcon fontSize="small"/>
                            </IconButton>
                          )}
                        </Box>
                      </Box>
                      <WeightInput
                        valueKg={group.parent.weight}
                        unit={effectiveUnit}
                        onChange={(kgStr) => handleSetUpdate(parentSetIdx, 'weight', kgStr)}
                        onLongPress={(el) => setUnitMenuAnchor(el)}
                        ariaLabel={`Weight set ${groupIdx + 1}`}
                        visibleLabel={false}
                        variant="standard"
                        sx={{flex: '1 1 0', minWidth: 0}}
                      />
                      <TextField
                        type="text"
                        size="small"
                        variant="standard"
                        hiddenLabel
                        autoComplete="off"
                        value={group.parent.reps ?? ''}
                        onChange={(e) => {
                          if (!/^\d*$/.test(e.target.value)) return;
                          handleSetUpdate(parentSetIdx, 'reps', e.target.value);
                        }}
                        sx={{flex: '1 1 0', minWidth: 0, '& input': {textAlign: 'center'}}}
                        inputProps={{inputMode: 'numeric', pattern: '[0-9]*', 'aria-label': `Reps set ${groupIdx + 1}`}}
                      />
                      <Box sx={{flex: '1 1 0', minWidth: 0}}>
                        <TextField
                          size="small"
                          variant="standard"
                          disabled
                          hiddenLabel
                          placeholder="Est. 1RM"
                          slotProps={{htmlInput: {'aria-label': `Est. 1RM set ${groupIdx + 1}`}}}
                          sx={{width: '100%', minWidth: 0, '& input': {textAlign: 'center'}}}
                          value={liveE1rm ? (kgToDisplay(liveE1rm, effectiveUnit === 'none' ? 'kg' : effectiveUnit) ?? liveE1rm).toFixed(1) : "-"}
                        />
                        {liveE1rm !== null && liveE1rm === todayBestE1rm && liveE1rm > (historicalBest || 0) && (
                          <EmojiEventsIcon
                            sx={{
                              position: 'absolute',
                              right: "0",
                              bottom: "-12px",
                              pointerEvents: 'none',
                              color: 'gold',
                            }}
                          />
                        )}
                      </Box>
                    </Box>
                  </ListItem>

                  {/* Effort chip row — shown when effortMetric is enabled */}
                  {settings.effortMetric !== 'none' && (
                    <EffortChipRow
                      metric={settings.effortMetric}
                      value={settings.effortMetric === 'rpe' ? (group.parent.rpe ?? null) : (group.parent.rir ?? null)}
                      onSelect={(v) => handleEffortUpdate(group.parent.id, settings.effortMetric as 'rpe' | 'rir', v)}
                    />
                  )}

                  {/* Drop set rows */}
                  {group.drops.map((drop, dropIdx) => {
                    const dropSetIdx = ex.sets.findIndex(s => s.id === drop.id);
                    return (
                      <ListItem
                        key={drop.id}
                        disablePadding
                        sx={{alignItems: 'center', mb: 0.5, mt: 1.5, pl: 4}}
                      >
                        <Box sx={{display: 'flex', alignItems: 'center', width: '100%', gap: 1, overflowX: 'hidden'}}>
                          <Box sx={{width: 72, flex: 'none', mr: 1}}>
                            <Typography variant="body2" color="text.secondary">
                              ↓ Drop {dropIdx + 1}
                            </Typography>
                          </Box>
                          <WeightInput
                            valueKg={drop.weight}
                            unit={effectiveUnit}
                            onChange={(kgStr) => handleSetUpdate(dropSetIdx, 'weight', kgStr)}
                            onLongPress={(el) => setUnitMenuAnchor(el)}
                            ariaLabel={`Drop ${dropIdx + 1} weight`}
                            visibleLabel={false}
                            variant="standard"
                            sx={{flex: '1 1 0', minWidth: 0}}
                          />
                          <TextField
                            type="text"
                            size="small"
                            variant="standard"
                            hiddenLabel
                            autoComplete="off"
                            value={drop.reps ?? ''}
                            onChange={(e) => {
                              if (!/^\d*$/.test(e.target.value)) return;
                              handleSetUpdate(dropSetIdx, 'reps', e.target.value);
                            }}
                            sx={{flex: '1 1 0', minWidth: 0, '& input': {textAlign: 'center'}}}
                            inputProps={{inputMode: 'numeric', pattern: '[0-9]*', 'aria-label': `Drop ${dropIdx + 1} reps`}}
                          />
                        </Box>
                      </ListItem>
                    );
                  })}
                </Box>
              );
            })}
          </List>

          <Box
            sx={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, cursor: 'pointer', width: '100%', mb: 0.5, mt: 1}}
            onClick={() => setHistoryOpen(o => !o)}
          >
            <Box sx={{display: 'flex', alignItems: 'center', minWidth: 0}}>
              <IconButton size="small" color={historyOpen || hasGraphableHistory ? 'primary' : 'default'} sx={{mr: 0.5}}>
                {historyOpen ? <InfoIcon fontSize="small"/> : <InfoOutlinedIcon fontSize="small"/>}
              </IconButton>
              <Typography variant="caption" color={historyOpen || hasGraphableHistory ? 'primary' : 'text.secondary'}>
                Est. 1RM history
              </Typography>
            </Box>
            {displayBest !== null && (
              <Typography
                variant="caption"
                color={isNewBest ? 'success.main' : 'primary'}
                fontWeight={600}
                sx={{flexShrink: 0}}
              >
                {isNewBest ? 'New best' : 'Personal Best E1RM'}: {displayBest.toFixed(1)}
              </Typography>
            )}
          </Box>

          <Collapse in={historyOpen} sx={{width: '100%', mb: 1}}>
            <E1rmSparkline
              exerciseId={ex.exerciseId}
              history={history}
              todayE1RM={todayBestE1rm}
            />
          </Collapse>

          {hasPreviousWorkout && (
            <Accordion disableGutters sx={{width: '100%', mt: 1}}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />} aria-controls="previous-workouts-content" id="previous-workouts-header">
                <Box sx={{display: 'flex', alignItems: 'center', gap: 1, minWidth: 0}}>
                  <Typography variant="body2" fontWeight={500}>Previous workouts</Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails sx={{pt: 0.5}}>
                {previousWorkouts.map((workout, idx) => (
                  <Box key={`${workout.completedAt}-${idx}`} sx={{mb: idx === previousWorkouts.length - 1 ? 0 : 1.5}}>
                    {formatCompletedDate(workout.completedAt) && (
                      <Typography variant="caption" color="text.secondary" sx={{display: 'block', mb: 0.75}}>
                        {formatCompletedDate(workout.completedAt)}
                        {workout.workoutName && ` · ${workout.workoutName}`}
                      </Typography>
                    )}
                    <Table
                      size="small"
                      aria-label={`Previous workout table ${idx + 1}`}
                      sx={{'& td, & th': {py: 0.5, px: 0.75}}}
                    >
                      <TableHead>
                        <TableRow>
                          <TableCell>Set</TableCell>
                          <TableCell>Weight</TableCell>
                          <TableCell>Reps</TableCell>
                          <TableCell>Est. 1RM</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {workout.sets.map(set => (
                          <TableRow key={set.order}>
                            <TableCell>{set.order}</TableCell>
                            <TableCell>{formatWeight(set.weight, effectiveUnit === 'none' ? 'kg' : effectiveUnit)}</TableCell>
                            <TableCell>{set.reps ?? '—'}</TableCell>
                            <TableCell>
                              {set.e1rm == null
                                ? '—'
                                : (kgToDisplay(set.e1rm, effectiveUnit === 'none' ? 'kg' : effectiveUnit) ?? set.e1rm).toFixed(1)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </Box>
                ))}
              </AccordionDetails>
            </Accordion>
          )}
        </Box>
        <ScrollEdgeFades axis="y" showStart={showStartFade} showEnd={showEndFade} size={48} background="paper" />
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
          Substitute exercise
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
            if (plateCalcSetIdx !== null) handleSetUpdate(plateCalcSetIdx, 'weight', kg.toString());
          }}
        />
      )}
    </Paper>
  );
}
