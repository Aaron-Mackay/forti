import React from 'react';
import {Box, Typography} from '@mui/material';

type Props = {
  month: string;
  height: number;
  sticky?: boolean;
  showDaysOfWeek?: boolean
};

const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const V_PADDING = 4

const MonthHeader: React.FC<Props> = ({month, height, sticky = false, showDaysOfWeek = false}) => (
  <Box
    sx={{
      backgroundColor: '#eee',
      borderBottom: '1px solid #ccc',
      padding: `${V_PADDING}px 8px`,
      ...(sticky
        ? {
          position: 'sticky',
          top: 0,
          zIndex: 2,
        }
        : {}),
    }}
  >
    <Box sx={{
      height: `${height - V_PADDING * 2}px`,
    }}>
      <Typography variant="subtitle2">{month}</Typography>
    </Box>
    {showDaysOfWeek && (
      <Box sx={{display: 'flex', justifyContent: 'space-between', mt: 1}}>
        {daysOfWeek.map((day) => (
          <Typography
            key={day}
            variant="caption"
            sx={{flex: 1, textAlign: 'center', fontWeight: 500}}
          >
            {day}
          </Typography>
        ))}
      </Box>
    )}
  </Box>
);

export default MonthHeader;

