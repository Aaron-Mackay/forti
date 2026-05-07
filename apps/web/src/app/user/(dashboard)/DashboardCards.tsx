"use client";
import {useState} from "react";
import {Box, Chip, Grid, Typography} from "@mui/material";
import FitnessCenterIcon from "@mui/icons-material/FitnessCenter";
import TodayIcon from "@mui/icons-material/Today";
import EventAvailableIcon from "@mui/icons-material/EventAvailable";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import UpcomingIcon from "@mui/icons-material/Upcoming";
import {MetricPrisma, EventPrisma} from "@/types/dataTypes";
import type {ActivePlanWithStats} from "@lib/userService";
import {Settings} from "@/types/settingsTypes";
import {EventType} from "@/generated/prisma/browser";
import {convertDateToDateString} from "@lib/dateUtils";
import {getDefinedBlockColor} from "@/app/user/calendar/utils";
import {MetricsBar, MetricKey} from "@/app/user/calendar/MetricBar";
import MetricDrawer from "@/app/user/(dashboard)/MetricDrawer";
import WelcomeModal from "@/app/user/(dashboard)/WelcomeModal";
import GettingStartedCard from "@/app/user/(dashboard)/GettingStartedCard";
import DashboardTile from "@/app/user/(dashboard)/_components/DashboardTile";

function findNextWorkout(activePlan: ActivePlanWithStats['activePlan']) {
  if (!activePlan) return null;

  for (const week of activePlan.weeks) {
    for (const workout of week.workouts) {
      if (!workout.dateCompleted) {
        return { workout, week, plan: activePlan };
      }
    }
  }

  return { workout: null, week: null, plan: activePlan };
}

function getTodayMetric(dayMetrics: MetricPrisma[], today: Date) {
  const todayStr = convertDateToDateString(today);
  return dayMetrics.find(
    dm => convertDateToDateString(new Date(dm.date)) === todayStr
  ) ?? null;
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
  activePlanData: ActivePlanWithStats | null;
  metrics: MetricPrisma[];
  events: EventPrisma[];
  today: Date;
  userId: string;
  settings: Settings;
}

export default function DashboardCards({activePlanData, metrics, events, today, userId, settings}: DashboardCardsProps) {
  const nextWorkout = findNextWorkout(activePlanData?.activePlan ?? null);
  const [todayMetricState, setTodayMetricState] = useState<MetricPrisma | null>(
    getTodayMetric(metrics, today)
  );
  const [selectedMetric, setSelectedMetric] = useState<MetricKey | null>(null);
  const [inputValue, setInputValue] = useState<string | number | null>(null);

  const weeklyCount = activePlanData?.weeklyTrainingCount ?? 0;
  const activeBlock = getActiveBlock(events, today);
  const upcomingEvents = getUpcomingEvents(events, today);

  const setMetricStateCb = (_date: Date, metric: MetricPrisma | null) => {
    setTodayMetricState(metric);
  };

  return (
    <>
      <WelcomeModal />
      <GettingStartedCard activePlanData={activePlanData} metrics={metrics} today={today} />
      <Grid container spacing={2} sx={{mb: 2}}>

        {/* Next Workout */}
        {settings.showNextWorkout && <Grid size={{xs: 12, sm: 6, md: 4}}>
          <DashboardTile
            icon={<FitnessCenterIcon color="primary" fontSize="small"/>}
            title="Next Workout"
            href={nextWorkout?.workout ? `/user/workout?workoutId=${nextWorkout.workout.id}` : undefined}
          >
            {nextWorkout?.workout ? (
              <>
                <Typography variant="h6" sx={{fontWeight: 600, lineHeight: 1.2, mb: 0.5}}>
                  {nextWorkout.workout.name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {nextWorkout.plan.name} · Week {nextWorkout.week!.order} ·{" "}
                  {nextWorkout.workout.exercises.length} exercise{nextWorkout.workout.exercises.length !== 1 ? "s" : ""}
                </Typography>
              </>
            ) : (
              <Typography variant="body2" color="text.secondary">
                {nextWorkout
                  ? `${nextWorkout.plan.name} has no remaining workouts.`
                  : 'No active plan selected.'}
              </Typography>
            )}
          </DashboardTile>
        </Grid>}

        {/* Today's Metrics */}
        {settings.showTodaysMetrics && <Grid size={{xs: 12, sm: 6, md: 4}}>
          <DashboardTile
            icon={<TodayIcon color="secondary" fontSize="small"/>}
            title="Today"
          >
            <MetricsBar
              dateMetric={todayMetricState}
              setSelectedMetric={setSelectedMetric}
              setInputValue={setInputValue}
              customMetricDefs={settings.customMetrics}
            />
          </DashboardTile>
        </Grid>}

        {/* Weekly Training */}
        {settings.showWeeklyTraining && <Grid size={{xs: 12, sm: 6, md: 4}}>
          <DashboardTile
            icon={<EventAvailableIcon color="success" fontSize="small"/>}
            title="This Week"
          >
            <Typography variant="h4" sx={{fontWeight: 700}}>
              {weeklyCount}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {weeklyCount === 1 ? "day trained" : "days trained"} so far
            </Typography>
          </DashboardTile>
        </Grid>}

        {/* Active Training Block (conditional) */}
        {settings.showActiveBlock && activeBlock && (() => {
          const blockColor = activeBlock.customColor ??
            (activeBlock.blockSubtype ? getDefinedBlockColor(activeBlock.blockSubtype) : undefined);
          return (
            <Grid size={{xs: 12, sm: 6, md: 4}}>
              <DashboardTile
                icon={<CalendarMonthIcon fontSize="small" sx={{color: blockColor ?? "inherit"}}/>}
                title="Active Block"
                href="/user/calendar"
                borderColor={blockColor}
              >
                <Box sx={{display: 'flex', alignItems: 'center', gap: 1, mb: 0.5}}>
                  <Typography variant="h6" sx={{fontWeight: 600}}>
                    {activeBlock.name}
                  </Typography>
                  {activeBlock.blockSubtype && (
                    <Chip
                      label={activeBlock.blockSubtype}
                      size="small"
                      sx={{
                        bgcolor: blockColor,
                        color: '#fff',
                        fontWeight: 600,
                      }}
                    />
                  )}
                </Box>
                <Typography variant="body2" color="text.secondary">
                  {daysRemaining(new Date(activeBlock.endDate), today)} days remaining
                </Typography>
              </DashboardTile>
            </Grid>
          );
        })()}

        {/* Upcoming Events (conditional) */}
        {settings.showUpcomingEvents && upcomingEvents.length > 0 && (
          <Grid size={{xs: 12, sm: 6, md: 4}}>
            <DashboardTile
              icon={<UpcomingIcon color="info" fontSize="small"/>}
              title="Upcoming (7 days)"
              href="/user/calendar"
            >
              <Box sx={{display: 'flex', flexDirection: 'column', gap: 0.5}}>
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
            </DashboardTile>
          </Grid>
        )}

      </Grid>

      <MetricDrawer
        open={selectedMetric !== null}
        onClose={() => setSelectedMetric(null)}
        selectedMetric={selectedMetric}
        setSelectedMetric={setSelectedMetric}
        inputValue={inputValue}
        setInputValue={setInputValue}
        dateMetric={todayMetricState}
        date={today}
        userId={userId}
        setMetricStateCb={setMetricStateCb}
        customMetricDefs={settings.customMetrics}
      />
    </>
  );
}
