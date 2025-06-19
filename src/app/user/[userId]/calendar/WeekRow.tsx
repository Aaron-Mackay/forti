import React from 'react';
import { Box, Grid, Typography } from '@mui/material';
import { format } from 'date-fns';

type Props = {
  week: Date[];
  isCurrentWeek: boolean;
  rowHeight: number;
};

const WeekRow: React.FC<Props> = ({ week, isCurrentWeek, rowHeight }) => (
  <Box sx={{ height: rowHeight, position: 'relative' }}>
    <Grid
      container
      sx={{
        height: '100%',
        alignItems: 'center',
        borderBottom: '1px solid #ddd',
        backgroundColor: isCurrentWeek ? '#e3f2fd' : 'white',
      }}
    >
      {week.map((date) => {
        const dateStr = format(date, 'yyyy-MM-dd');
        const color = 'pink'; // Placeholder for event coloring

        return (
          <Grid size={{xs: 1.714}} key={dateStr}>
            <Box
              sx={{
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: color || 'transparent',
                borderRight: '1px solid #eee',
              }}
            >
              <Typography variant="caption">{format(date, 'd')}</Typography>
            </Box>
          </Grid>
        );
      })}
    </Grid>
  </Box>
);

export default WeekRow;