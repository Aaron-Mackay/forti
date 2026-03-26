'use client';

import React from 'react';
import { Box, Divider, Typography } from '@mui/material';
import { PlanPrisma } from '@/types/dataTypes';
import { getWeekStatus, getWorkoutStatus } from '@/lib/workoutProgress';
import ProgressIcon from '@/lib/ProgressIcon';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import EditableExerciseLogCard from './EditableExerciseLogCard';

interface LogViewProps {
  plan: PlanPrisma;
  planId: number;
}

const LogView = ({ plan, planId }: LogViewProps) => (
  <Box>
    {plan.weeks.map((week, wi) => (
      <Box key={week.id}>
        {wi > 0 && <Divider sx={{ my: 2 }} />}

        {/* Week header */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 1.5 }}>
          <Typography
            variant="overline"
            sx={{ fontWeight: 700, letterSpacing: 1, lineHeight: 1 }}
          >
            Week {week.order}
          </Typography>
          <ProgressIcon status={getWeekStatus(week)} />
        </Box>

        {/* Workouts */}
        {week.workouts.map(workout => (
          <Box key={workout.id} sx={{ mb: 2.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.75 }}>
              <Typography
                variant="subtitle2"
                sx={{
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                  fontSize: '0.8rem',
                  color: 'text.secondary',
                  fontWeight: 700,
                }}
              >
                {workout.name || `Workout ${workout.order}`}
              </Typography>
              <ProgressIcon status={getWorkoutStatus(workout)} />
            </Box>

            {workout.notes && (
              <Typography
                component="div"
                variant="caption"
                color="text.secondary"
                sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1, ml: 0.25 }}
              >
                <ChatBubbleOutlineIcon sx={{ fontSize: 12, flexShrink: 0 }} />
                <span>{workout.notes}</span>
              </Typography>
            )}

            {workout.exercises.map((exerciseLink, i) => (
              <EditableExerciseLogCard
                key={exerciseLink.id}
                exerciseLink={exerciseLink}
                index={i}
                planId={planId}
                weekId={week.id}
                workoutId={workout.id}
              />
            ))}
          </Box>
        ))}
      </Box>
    ))}
  </Box>
);

export default LogView;
