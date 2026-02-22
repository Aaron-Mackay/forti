'use client';

import React, { useState } from 'react';
import { Box, Tab, Tabs, Typography } from '@mui/material';
import { PlanPrisma } from '@/types/dataTypes';
import MobileExerciseCard from './MobileExerciseCard';

interface MobilePlanViewProps {
  plan: PlanPrisma;
}

const MobilePlanView = ({ plan }: MobilePlanViewProps) => {
  const [activeWeekIndex, setActiveWeekIndex] = useState(0);
  const activeWeek = plan.weeks[activeWeekIndex];

  return (
    <Box>
      <Tabs
        value={activeWeekIndex}
        onChange={(_event, value: number) => setActiveWeekIndex(value)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}
      >
        {plan.weeks.map((week) => (
          <Tab key={week.id} label={`Wk ${week.order}`} sx={{ minWidth: 'unset', px: 2 }} />
        ))}
      </Tabs>

      {activeWeek?.workouts.map((workout) => (
        <Box key={workout.id} sx={{ mb: 3 }}>
          <Typography
            variant="subtitle1"
            fontWeight={700}
            sx={{ mb: 1, textTransform: 'uppercase', letterSpacing: 0.5, fontSize: '0.85rem', color: 'text.secondary' }}
          >
            {workout.name || `Workout ${workout.order}`}
          </Typography>
          {workout.exercises.map((exerciseLink, i) => (
            <MobileExerciseCard
              key={exerciseLink.id}
              exerciseLink={exerciseLink}
              index={i}
            />
          ))}
        </Box>
      ))}
    </Box>
  );
};

export default MobilePlanView;
