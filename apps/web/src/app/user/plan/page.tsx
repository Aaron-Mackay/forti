import React from "react";
import getLoggedInUser from "@lib/getLoggedInUser";
import AppBarTitle from "@/components/shell/AppBarTitle";
import PlansListCard, { type PlanListItem } from "./PlansListCard";
import { getWorkoutData } from "@lib/userService";
import { notFound } from "next/navigation";
import { getWeekStatus } from "@/lib/workoutProgress";
import { loadSignalFlag } from "@lib/signal/loadSignalFlag";
import { SignalSurface } from "@/components/signal/SignalSurface";
import type { PlanPrisma } from "@/types/dataTypes";

function toPlanListItem(plan: PlanPrisma, activePlanId: number | null): PlanListItem {
  const sortedWeeks = [...plan.weeks].sort((a, b) => a.order - b.order);
  const activeWeek = sortedWeeks.find((week) => getWeekStatus(week) !== 'completed') ?? null;
  const nextWorkout = activeWeek?.workouts.find((workout) => !workout.dateCompleted) ?? null;
  const weeksDone = sortedWeeks.filter((week) => getWeekStatus(week) === 'completed').length;

  return {
    id: plan.id,
    name: plan.name,
    order: plan.order,
    weekCount: sortedWeeks.length,
    lastActivityDate: plan.lastActivityDate,
    isActive: plan.id === activePlanId,
    daysPerWeek: sortedWeeks[0]?.workouts.length ?? 0,
    weeksDone,
    isCompleted: sortedWeeks.length > 0 && weeksDone === sortedWeeks.length,
    nextWorkoutId: nextWorkout?.id ?? null,
    nextWorkoutName: nextWorkout?.name ?? null,
    activeWeekOrder: activeWeek?.order ?? null,
  };
}

const PlanPage = async () => {
  const user = await getLoggedInUser()
  const userData = await getWorkoutData(user.id)
  if (!userData) return notFound()
  const signalEnabled = await loadSignalFlag()
  const plans = userData.plans.map((plan) => toPlanListItem(plan, userData.activePlanId))

  return (
    <SignalSurface signalEnabled={signalEnabled} surface="planning">
      {!signalEnabled && <AppBarTitle title="Plans" />}
      <PlansListCard
        title="Plans"
        emptyMessage="No plans yet. Create one to get started."
        createHref="/user/plan/create"
        planHrefBase="/user/plan"
        plans={plans}
        signalEnabled={signalEnabled}
      />
    </SignalSurface>
  )
};

export default PlanPage;
