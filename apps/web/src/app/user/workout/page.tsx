import { getWorkoutData } from '@lib/userService';
import WorkoutClient from './WorkoutClient';
import {notFound} from "next/navigation";
import NetworkStatusBanner from "./_components/NetworkStatusBanner";
import getLoggedInUser from "@lib/getLoggedInUser";
import {Loading} from "@/components/shell/Loading";
import {Suspense} from "react";
import { SignalSurface } from '@/components/signal/SignalSurface';
import { loadSignalFlag } from '@lib/signal/loadSignalFlag';

export default async function DashboardPage() {
  const userId = (await getLoggedInUser()).id
  const userData = await getWorkoutData(userId);
  if (!userData) {
    return notFound()
  }

  const signalEnabled = await loadSignalFlag();

  return <>
    <NetworkStatusBanner/>
    <Suspense fallback={<Loading/>}>
      <SignalSurface signalEnabled={signalEnabled} surface="gym">
        <WorkoutClient userData={userData} signalEnabled={signalEnabled}/>
      </SignalSurface>
    </Suspense>
  </>
}
