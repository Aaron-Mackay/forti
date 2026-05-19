import { notFound } from 'next/navigation';
import getLoggedInUser from '@lib/getLoggedInUser';
import { getWorkoutData } from '@lib/userService';
import WeekSelectorCard from '@/app/user/plan/WeekSelectorCard';
import { SignalSurface } from '@/components/signal/SignalSurface';
import { loadSignalFlag } from '@lib/signal/loadSignalFlag';

export default async function PlanWeeksPage({
  params,
}: {
  params: Promise<{ planId: string }>;
}) {
  const { planId } = await params;
  const planIdNum = Number(planId);
  if (Number.isNaN(planIdNum)) return notFound();

  const userId = (await getLoggedInUser()).id;
  const userData = await getWorkoutData(userId);
  if (!userData) return notFound();

  const plan = userData.plans.find((candidate) => candidate.id === planIdNum);
  if (!plan) return notFound();

  const signalEnabled = await loadSignalFlag();

  return (
    <SignalSurface signalEnabled={signalEnabled} surface="planning">
      <WeekSelectorCard
        plan={plan}
        activePlanId={userData.activePlanId}
        signalEnabled={signalEnabled}
      />
    </SignalSurface>
  );
}
