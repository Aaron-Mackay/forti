"use client";
import React from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Grid,
  Typography,
} from "@mui/material";
import FitnessCenterIcon from "@mui/icons-material/FitnessCenter";
import TodayIcon from "@mui/icons-material/Today";
import EventAvailableIcon from "@mui/icons-material/EventAvailable";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import UpcomingIcon from "@mui/icons-material/Upcoming";
import Link from "next/link";
import {DayMetricPrisma, EventPrisma, UserPrisma} from "@/types/dataTypes";
import {EventType} from "@prisma/client";
import {convertDateToDateString} from "@lib/dateUtils";
import {getDefinedBlockColor} from "@/app/user/calendar/utils";

function findNextWorkout(userData: UserPrisma | null) {
  if (!userData) return null;
  for (const plan of userData.plans) {
    for (const week of plan.weeks) {
      for (const workout of week.workouts) {
        if (!workout.dateCompleted) {
          return {workout, week, plan};
        }
      }
    }
  }
  return null;
}

function getTodayMetric(dayMetrics: DayMetricPrisma[], today: Date) {
  const todayStr = convertDateToDateString(today);
  return dayMetrics.find(
    dm => convertDateToDateString(new Date(dm.date)) === todayStr
  ) ?? null;
}

function getWeeklyTrainingCount(userData: UserPrisma | null, today: Date): number {
  if (!userData) return 0;
  const dayOfWeek = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
  monday.setHours(0, 0, 0, 0);

  let count = 0;
  for (const plan of userData.plans) {
    for (const week of plan.weeks) {
      for (const workout of week.workouts) {
        if (workout.dateCompleted) {
          const completed = new Date(workout.dateCompleted);
          if (completed >= monday && completed <= today) count++;
        }
      }
    }
  }
  return count;
}

function getActiveBlock(events: EventPrisma[], today: Date) {
  return events.find(ev => {
    if (ev.eventType !== EventType.BlockEvent) return false;
    const start = new Date(ev.startDate);
    const end = new Date(ev.endDate);
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
    return start <= today && end >= today;
  }) ?? null;
}

function getUpcomingEvents(events: EventPrisma[], today: Date) {
  const sevenDaysAhead = new Date(today);
  sevenDaysAhead.setDate(today.getDate() + 7);
  sevenDaysAhead.setHours(23, 59, 59, 999);

  const todayStart = new Date(today);
  todayStart.setHours(0, 0, 0, 0);

  return events.filter(ev => {
    const start = new Date(ev.startDate);
    return start >= todayStart && start <= sevenDaysAhead;
  });
}

function daysRemaining(endDate: Date, today: Date): number {
  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);
  const todayStart = new Date(today);
  todayStart.setHours(0, 0, 0, 0);
  return Math.ceil((end.getTime() - todayStart.getTime()) / (1000 * 60 * 60 * 24));
}

interface DashboardCardsProps {
  userData: UserPrisma | null;
  dayMetrics: DayMetricPrisma[];
  events: EventPrisma[];
  today: Date;
}

export default function DashboardCards({userData, dayMetrics, events, today}: DashboardCardsProps) {
  const nextWorkout = findNextWorkout(userData);
  const todayMetric = getTodayMetric(dayMetrics, today);
  const weeklyCount = getWeeklyTrainingCount(userData, today);
  const activeBlock = getActiveBlock(events, today);
  const upcomingEvents = getUpcomingEvents(events, today);

  return (
    <Grid container spacing={2} sx={{mb: 2}}>

      {/* Next Workout */}
      <Grid size={{xs: 12, sm: 6, md: 4}}>
        <Card variant="outlined" sx={{height: '100%'}}>
          <CardContent sx={{display: 'flex', flexDirection: 'column', height: '100%'}}>
            <Box sx={{display: 'flex', alignItems: 'center', gap: 1, mb: 1}}>
              <FitnessCenterIcon color="primary" fontSize="small"/>
              <Typography variant="overline" color="text.secondary">Next Workout</Typography>
            </Box>
            {nextWorkout ? (
              <>
                <Typography variant="h6" sx={{fontWeight: 600, lineHeight: 1.2, mb: 0.5}}>
                  {nextWorkout.workout.name}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{mb: 1}}>
                  {nextWorkout.plan.name} · Week {nextWorkout.week.order + 1} ·{" "}
                  {nextWorkout.workout.exercises.length} exercise{nextWorkout.workout.exercises.length !== 1 ? "s" : ""}
                </Typography>
                <Box sx={{mt: 'auto'}}>
                  <Button
                    component={Link}
                    href="/user/workout"
                    variant="contained"
                    size="small"
                  >
                    Go
                  </Button>
                </Box>
              </>
            ) : (
              <Typography variant="body2" color="text.secondary">
                No workouts planned yet.
              </Typography>
            )}
          </CardContent>
        </Card>
      </Grid>

      {/* Today's Metrics */}
      <Grid size={{xs: 12, sm: 6, md: 4}}>
        <Card variant="outlined" sx={{height: '100%'}}>
          <CardContent sx={{display: 'flex', flexDirection: 'column', height: '100%'}}>
            <Box sx={{display: 'flex', alignItems: 'center', gap: 1, mb: 1}}>
              <TodayIcon color="secondary" fontSize="small"/>
              <Typography variant="overline" color="text.secondary">Today</Typography>
            </Box>
            {todayMetric && (todayMetric.weight ?? todayMetric.steps ?? todayMetric.calories) ? (
              <>
                {todayMetric.weight != null && (
                  <Typography variant="body2">Weight: <strong>{todayMetric.weight} kg</strong></Typography>
                )}
                {todayMetric.steps != null && (
                  <Typography variant="body2">Steps: <strong>{todayMetric.steps.toLocaleString()}</strong></Typography>
                )}
                {todayMetric.calories != null && (
                  <Typography variant="body2">Calories: <strong>{todayMetric.calories.toLocaleString()}</strong></Typography>
                )}
                <Box sx={{mt: 'auto', pt: 1}}>
                  <Button
                    component={Link}
                    href="/user/calendar"
                    variant="outlined"
                    size="small"
                  >
                    View calendar
                  </Button>
                </Box>
              </>
            ) : (
              <>
                <Typography variant="body2" color="text.secondary" sx={{mb: 1}}>
                  Nothing logged today.
                </Typography>
                <Box>
                  <Button
                    component={Link}
                    href="/user/calendar"
                    variant="outlined"
                    size="small"
                  >
                    Log metrics
                  </Button>
                </Box>
              </>
            )}
          </CardContent>
        </Card>
      </Grid>

      {/* Weekly Training */}
      <Grid size={{xs: 12, sm: 6, md: 4}}>
        <Card variant="outlined" sx={{height: '100%'}}>
          <CardContent sx={{display: 'flex', flexDirection: 'column', height: '100%'}}>
            <Box sx={{display: 'flex', alignItems: 'center', gap: 1, mb: 1}}>
              <EventAvailableIcon color="success" fontSize="small"/>
              <Typography variant="overline" color="text.secondary">This Week</Typography>
            </Box>
            <Typography variant="h4" sx={{fontWeight: 700}}>
              {weeklyCount}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {weeklyCount === 1 ? "day trained" : "days trained"} so far
            </Typography>
          </CardContent>
        </Card>
      </Grid>

      {/* Active Training Block (conditional) */}
      {activeBlock && (
        <Grid size={{xs: 12, sm: 6, md: 4}}>
          <Card
            variant="outlined"
            sx={{
              height: '100%',
              borderColor: activeBlock.customColor ??
                (activeBlock.blockSubtype ? getDefinedBlockColor(activeBlock.blockSubtype) : undefined),
            }}
          >
            <CardContent sx={{display: 'flex', flexDirection: 'column', height: '100%'}}>
              <Box sx={{display: 'flex', alignItems: 'center', gap: 1, mb: 1}}>
                <CalendarMonthIcon fontSize="small" sx={{
                  color: activeBlock.customColor ??
                    (activeBlock.blockSubtype ? getDefinedBlockColor(activeBlock.blockSubtype) : "inherit"),
                }}/>
                <Typography variant="overline" color="text.secondary">Active Block</Typography>
              </Box>
              <Box sx={{display: 'flex', alignItems: 'center', gap: 1, mb: 0.5}}>
                <Typography variant="h6" sx={{fontWeight: 600}}>
                  {activeBlock.name}
                </Typography>
                {activeBlock.blockSubtype && (
                  <Chip
                    label={activeBlock.blockSubtype}
                    size="small"
                    sx={{
                      bgcolor: activeBlock.customColor ??
                        (activeBlock.blockSubtype ? getDefinedBlockColor(activeBlock.blockSubtype) : undefined),
                      color: '#fff',
                      fontWeight: 600,
                    }}
                  />
                )}
              </Box>
              <Typography variant="body2" color="text.secondary">
                {daysRemaining(new Date(activeBlock.endDate), today)} days remaining
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      )}

      {/* Upcoming Events (conditional) */}
      {upcomingEvents.length > 0 && (
        <Grid size={{xs: 12, sm: 6, md: 4}}>
          <Card variant="outlined" sx={{height: '100%'}}>
            <CardContent sx={{display: 'flex', flexDirection: 'column', height: '100%'}}>
              <Box sx={{display: 'flex', alignItems: 'center', gap: 1, mb: 1}}>
                <UpcomingIcon color="info" fontSize="small"/>
                <Typography variant="overline" color="text.secondary">Upcoming (7 days)</Typography>
              </Box>
              <Box sx={{display: 'flex', flexDirection: 'column', gap: 0.5, mb: 1}}>
                {upcomingEvents.slice(0, 4).map(ev => (
                  <Typography key={ev.id} variant="body2">
                    <strong>{convertDateToDateString(new Date(ev.startDate)).slice(5)}</strong>
                    {" — "}
                    {ev.name}
                  </Typography>
                ))}
                {upcomingEvents.length > 4 && (
                  <Typography variant="body2" color="text.secondary">
                    +{upcomingEvents.length - 4} more
                  </Typography>
                )}
              </Box>
              <Box sx={{mt: 'auto'}}>
                <Button
                  component={Link}
                  href="/user/calendar"
                  variant="outlined"
                  size="small"
                >
                  View calendar
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      )}

    </Grid>
  );
}
