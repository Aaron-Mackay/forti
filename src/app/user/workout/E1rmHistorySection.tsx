'use client';

import {Box, Collapse, IconButton, Typography} from '@mui/material';
import InfoIcon from '@mui/icons-material/Info';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import E1rmSparkline from './E1rmSparkline';
import type {E1rmHistoryPoint} from '@lib/contracts/exerciseHistory';

type Props = {
  exerciseId: number;
  history: E1rmHistoryPoint[] | null;
  todayE1RM: number | null;
  historyOpen: boolean;
  onToggle: () => void;
  highlight: boolean;
  rightText?: string | null;
  rightTextColor?: string;
  mb?: number;
};

export default function E1rmHistorySection({
  exerciseId,
  history,
  todayE1RM,
  historyOpen,
  onToggle,
  highlight,
  mb = 1,
}: Props) {
  return (
    <>
      <Box
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
        onClick={onToggle}
      >
        <Box sx={{display: 'flex', alignItems: 'center', minWidth: 0}}>
          <IconButton size="small" color={historyOpen || highlight ? 'primary' : 'default'} sx={{mr: 0.5}}>
            {historyOpen ? <InfoIcon fontSize="small"/> : <InfoOutlinedIcon fontSize="small"/>}
          </IconButton>
          <Typography variant="caption" color={historyOpen || highlight ? 'primary' : 'text.secondary'}>
            Est. 1RM history
          </Typography>
        </Box>
      </Box>

      <Collapse in={historyOpen} sx={{width: '100%', mb}}>
        <E1rmSparkline
          exerciseId={exerciseId}
          history={history}
          todayE1RM={todayE1RM}
        />
      </Collapse>
    </>
  );
}
