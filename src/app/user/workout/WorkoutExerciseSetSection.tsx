'use client';

import {
  Box,
  Chip,
  IconButton,
  List,
  ListItem,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import CalculateOutlinedIcon from '@mui/icons-material/CalculateOutlined';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import VideocamIcon from '@mui/icons-material/Videocam';
import WeightInput from './WeightInput';
import {computeE1rm} from '@/lib/e1rm';
import {kgToDisplay} from '@/lib/units';
import type {SetPrisma, WorkoutExercisePrisma} from '@/types/dataTypes';

const RPE_VALUES = [6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10];
const RIR_VALUES = [0, 1, 2, 3, 4];

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

type Props = {
  ex: WorkoutExercisePrisma;
  effectiveUnit: 'kg' | 'lbs' | 'none';
  isBarbell: boolean;
  showPlateCalculator: boolean;
  effortMetric: 'none' | 'rpe' | 'rir';
  todayBestE1rm: number | null;
  historicalBest: number | null;
  handleSetUpdate: (workoutExerciseId: number, setIdx: number, field: 'weight' | 'reps', value: string) => void;
  handleEffortUpdate: (workoutExerciseId: number, setId: number, field: 'rpe' | 'rir', value: number | null) => void;
  onOpenUnitMenu: (el: HTMLElement) => void;
  onOpenPlateCalc: (setIdx: number) => void;
  showHeaders?: boolean;
  initialSetCount?: number
};

export default function WorkoutExerciseSetSection({
  ex,
  effectiveUnit,
  isBarbell,
  showPlateCalculator,
  effortMetric,
  todayBestE1rm,
  historicalBest,
  handleSetUpdate,
  handleEffortUpdate,
  onOpenUnitMenu,
  onOpenPlateCalc,
  showHeaders = true,
  initialSetCount = 0
}: Props) {
  const groups = groupSets(ex.sets);

  return (
    <>
      {ex.sets.length > 0 && showHeaders && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            width: '100%',
            gap: 1,
            px: 1,
            boxSizing: 'border-box',
          }}
        >
          <Box sx={{width: 36, flex: 'none'}}>
            <Typography variant="caption" color="text.secondary" sx={{display: 'block', textAlign: 'left'}}>Set</Typography>
          </Box>
          <Box sx={{flex: '1 1 0', minWidth: 0}}>
            <Typography variant="caption" color="text.secondary" sx={{display: 'block', textAlign: 'center'}}>Weight</Typography>
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
          const setCountIdx = groupIdx + initialSetCount
          const parentSetIdx = ex.sets.findIndex(s => s.id === group.parent.id);
          const liveE1rm = computeE1rm(group.parent.weight, group.parent.reps);

          return (
            <Box key={group.parent.id}>
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
                        {groupIdx === 0 && ex.requiresRecording
                          ? <Tooltip placement='right' title='Record a set and send to your coach'>
                            <VideocamIcon sx={{color: '#e8453c'}}/>
                          </Tooltip>
                          : <Typography variant="caption" fontWeight={600}>{setCountIdx + 1}</Typography>
                        }
                      </Box>
                      {isBarbell && effectiveUnit !== 'none' && showPlateCalculator && (
                        <IconButton
                          size="small"
                          aria-label="Open plate calculator"
                          onClick={() => onOpenPlateCalc(parentSetIdx)}
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
                    onChange={(kgStr) => handleSetUpdate(ex.id, parentSetIdx, 'weight', kgStr)}
                    onLongPress={(el) => onOpenUnitMenu(el)}
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
                      handleSetUpdate(ex.id, parentSetIdx, 'reps', e.target.value);
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

              {effortMetric !== 'none' && (
                <EffortChipRow
                  metric={effortMetric}
                  value={effortMetric === 'rpe' ? (group.parent.rpe ?? null) : (group.parent.rir ?? null)}
                  onSelect={(v) => handleEffortUpdate(ex.id, group.parent.id, effortMetric, v)}
                />
              )}

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
                        onChange={(kgStr) => handleSetUpdate(ex.id, dropSetIdx, 'weight', kgStr)}
                        onLongPress={(el) => onOpenUnitMenu(el)}
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
                          handleSetUpdate(ex.id, dropSetIdx, 'reps', e.target.value);
                        }}
                        sx={{flex: '1 1 0', minWidth: 0, '& input': {textAlign: 'center'}}}
                        inputProps={{
                          inputMode: 'numeric',
                          pattern: '[0-9]*',
                          'aria-label': `Drop ${dropIdx + 1} reps`
                        }}
                      />
                    </Box>
                  </ListItem>
                );
              })}
            </Box>
          );
        })}
      </List>
    </>
  );
}
