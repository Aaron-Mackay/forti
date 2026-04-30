'use client';

import {Box} from '@mui/material';
import E1rmSparkline from './E1rmSparkline';
import type {E1rmHistoryPoint} from '@lib/contracts/exerciseHistory';

type Props = {
  exerciseId: number;
  history: E1rmHistoryPoint[] | null;
  todayE1RM: number | null;
};

export default function E1rmHistorySection({
  exerciseId,
  history,
  todayE1RM,
}: Props) {
  return (
    <Box sx={{width: '100%', mb: 1}}>
      <E1rmSparkline
        exerciseId={exerciseId}
        history={history}
        todayE1RM={todayE1RM}
      />
    </Box>
  );
}
