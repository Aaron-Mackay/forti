import { getWorkoutData } from '@lib/userService';
import WorkoutClient from './WorkoutClient';
import NoActivePlanEmptyState from './NoActivePlanEmptyState';
import {notFound, redirect} from "next/navigation";
import NetworkStatusBanner from "./_components/NetworkStatusBanner";
import getLoggedInUser from "@lib/getLoggedInUser";
import {Loading} from "@/components/shell/Loading";
import {Suspense} from "react";
import { SignalSurface } from '@/components/signal/SignalSurface';
import { loadSignalFlag } from '@lib/signal/loadSignalFlag';

export default async function WorkoutPage({
  searchParams,
}: {
  searchParams: Promise<{ workoutId?: string; weekId?: string }>;
}) {
  const userId = (await getLoggedInUser()).id
  const userData = await getWorkoutData(userId);
  if (!userData) {
    return notFound()
  }

  const { workoutId, weekId } = await searchParams;
  const signalEnabled = await loadSignalFlag();

  if (workoutId || weekId) {
    return <>
      <NetworkStatusBanner/>
      <Suspense fallback={<Loading/>}>
        <SignalSurface signalEnabled={signalEnabled} surface="gym">
          <WorkoutClient userData={userData} signalEnabled={signalEnabled}/>
        </SignalSurface>
      </Suspense>
    </>
  }

  if (userData.activePlanId === null) {
    return (
      <SignalSurface signalEnabled={signalEnabled} surface="gym">
        <NoActivePlanEmptyState signalEnabled={signalEnabled} />
      </SignalSurface>
    );
  }

  redirect(`/user/plan/${userData.activePlanId}/weeks`);
}
