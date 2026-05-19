import { notFound } from 'next/navigation';
import getLoggedInUser from '@lib/getLoggedInUser';
import prisma from '@lib/prisma';
import AppBarTitle from '@/components/shell/AppBarTitle';
import PlansListCard, { type PlanListItem } from '@/app/user/plan/PlansListCard';
import { loadSignalFlag } from '@lib/signal/loadSignalFlag';
import { SignalSurface } from '@/components/signal/SignalSurface';
import { SignalBackLink } from '@/components/signal/SignalBackLink';
import { SignalClientNav } from '../_components/SignalClientNav';
import { getWorkoutData } from '@lib/userService';
import { getWeekStatus } from '@/lib/workoutProgress';
import type { PlanPrisma } from '@/types/dataTypes';

interface Props {
  params: Promise<{ clientId: string }>;
}

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

export default async function ClientPlansPage({ params }: Props) {
  const { clientId } = await params;
  const user = await getLoggedInUser();
  const signalEnabled = await loadSignalFlag();

  const client = await prisma.user.findUnique({
    where: { id: clientId },
    select: { id: true, name: true, coachId: true, activePlanId: true },
  });

  if (!client || client.coachId !== user.id) {
    notFound();
  }

  const userData = await getWorkoutData(clientId);
  if (!userData) notFound();

  const planItems = userData.plans.map((plan) => toPlanListItem(plan, userData.activePlanId));

  if (signalEnabled) {
    return (
      <SignalSurface signalEnabled={signalEnabled} surface="planning">
        <SignalBackLink href="/user/coach/clients" label="Clients" />
        <SignalClientNav clientId={clientId} />
        <PlansListCard
          title={`${client.name ?? 'Client'}'s Plans`}
          emptyMessage="No plans yet."
          createHref={`/user/plan/create?forUserId=${clientId}`}
          planHrefBase="/user/plan"
          targetUserId={clientId}
          plans={planItems}
          signalEnabled
        />
      </SignalSurface>
    );
  }

  return (
    <>
      <AppBarTitle title="Plans" showBack backHref={`/user/coach/clients/${clientId}`} />
      <PlansListCard
        title={`${client.name ?? 'Client'}'s Plans`}
        emptyMessage="No plans yet."
        createHref={`/user/plan/create?forUserId=${clientId}`}
        planHrefBase="/user/plan"
        targetUserId={clientId}
        plans={planItems}
      />
    </>
  );
}
