import { notFound } from 'next/navigation';
import getLoggedInUser from '@lib/getLoggedInUser';
import prisma from '@lib/prisma';
import { getWorkoutData } from '@lib/userService';
import WeekSelectorCard from '@/app/user/plan/WeekSelectorCard';
import { SignalSurface } from '@/components/signal/SignalSurface';
import { loadSignalFlag } from '@lib/signal/loadSignalFlag';
import { SignalBackLink } from '@/components/signal/SignalBackLink';
import { SignalClientNav } from '../../../_components/SignalClientNav';

function firstName(name: string) {
  return name.trim().split(/\s+/)[0] || name;
}

export default async function CoachPlanWeeksPage({
  params,
}: {
  params: Promise<{ clientId: string; planId: string }>;
}) {
  const { clientId, planId } = await params;
  const planIdNum = Number(planId);
  if (Number.isNaN(planIdNum)) return notFound();

  const coach = await getLoggedInUser();
  const client = await prisma.user.findUnique({
    where: { id: clientId },
    select: { id: true, name: true, coachId: true, activePlanId: true },
  });

  if (!client || client.coachId !== coach.id) return notFound();

  const userData = await getWorkoutData(clientId);
  if (!userData) return notFound();

  const plan = userData.plans.find((candidate) => candidate.id === planIdNum);
  if (!plan) return notFound();

  const signalEnabled = await loadSignalFlag();

  return (
    <SignalSurface signalEnabled={signalEnabled} surface="planning">
      <SignalBackLink href={`/user/coach/clients/${clientId}/plans`} label="Plans" />
      <SignalClientNav clientId={clientId} />
      <WeekSelectorCard
        plan={plan}
        activePlanId={userData.activePlanId}
        targetUserId={clientId}
        client={{ name: client.name, firstName: firstName(client.name) }}
        coach={{ name: coach.name ?? 'Coach', firstName: firstName(coach.name ?? 'Coach') }}
        signalEnabled={signalEnabled}
      />
    </SignalSurface>
  );
}
