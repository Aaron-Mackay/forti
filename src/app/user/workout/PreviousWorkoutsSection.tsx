'use client';

import {useState} from 'react';
import {Box, ButtonBase, Collapse, IconButton, Table, TableBody, TableCell, TableHead, TableRow, Typography} from '@mui/material';
import HistoryIcon from '@mui/icons-material/History';
import HistoryOutlinedIcon from '@mui/icons-material/HistoryOutlined';
import {formatWeight, kgToDisplay} from '@/lib/units';
import type {PreviousExerciseHistory} from '@lib/contracts/exerciseHistory';

type Block = {
  label?: string;
  history: PreviousExerciseHistory;
};

type Props = {
  blocks: Block[];
  weightUnit: 'kg' | 'lbs';
  tableLabelPrefix?: string;
};

export default function PreviousWorkoutsSection({blocks, weightUnit, tableLabelPrefix = 'Previous workout table'}: Props) {
  const visibleBlocks = blocks.filter(block => (block.history.workouts?.length ?? 0) > 0);
  const [open, setOpen] = useState(false);
  if (visibleBlocks.length === 0) return null;

  return (
    <>
      <ButtonBase
        aria-label="Previous workouts"
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 1,
          cursor: 'pointer',
          width: '100%',
          mb: 0.5,
          mt: 1,
        }}
        onClick={() => setOpen(v => !v)}
      >
        <Box sx={{display: 'flex', alignItems: 'center', minWidth: 0}}>
          <IconButton size="small" color={open ? 'primary' : 'default'} sx={{mr: 0.5}}>
            {open ? <HistoryIcon fontSize="small"/> : <HistoryOutlinedIcon fontSize="small"/>}
          </IconButton>
          <Typography variant="caption" color={open ? 'primary' : 'text.secondary'}>
            Previous workouts
          </Typography>
        </Box>
      </ButtonBase>

      <Collapse in={open} sx={{width: '100%'}}>
        {visibleBlocks.map((block, blockIdx) => (
          <Box key={block.label ?? String(blockIdx)} sx={{mb: blockIdx === visibleBlocks.length - 1 ? 0 : 1.5}}>
            {block.label ? (
              <Typography variant="caption" color="text.secondary" sx={{display: 'block', mb: 0.5}}>
                {block.label}
              </Typography>
            ) : null}
            {block.history.workouts.map((workout, workoutIdx) => {
              const priorWorkoutCount = visibleBlocks
                .slice(0, blockIdx)
                .reduce((sum, priorBlock) => sum + priorBlock.history.workouts.length, 0);
              const tableNumber = priorWorkoutCount + workoutIdx + 1;
              return (
                <Box key={`${workout.completedAt}-${workoutIdx}`} sx={{mb: workoutIdx === block.history.workouts.length - 1 ? 0 : 1.5}}>
                  {workout.completedAt ? (
                    <Typography variant="caption" color="text.secondary" sx={{display: 'block', mb: 0.75}}>
                      {new Date(workout.completedAt).toLocaleDateString(undefined, {month: 'short', day: 'numeric', year: 'numeric'})}
                      {workout.workoutName ? ` · ${workout.workoutName}` : ''}
                    </Typography>
                  ) : null}
                  <Table
                    size="small"
                    aria-label={`${tableLabelPrefix} ${tableNumber}`}
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
                          <TableCell align="center">{formatWeight(set.weight, weightUnit)}</TableCell>
                          <TableCell align="center">{set.reps ?? '—'}</TableCell>
                          <TableCell align="center">{set.e1rm == null ? '—' : (kgToDisplay(set.e1rm, weightUnit) ?? set.e1rm).toFixed(1)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Box>
              );
            })}
          </Box>
        ))}
      </Collapse>
    </>
  );
}
