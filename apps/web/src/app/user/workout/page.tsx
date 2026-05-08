import { getWorkoutData } from '@lib/userService';
import WorkoutClient from './WorkoutClient';
import {notFound} from "next/navigation";
import NetworkStatusBanner from "./_components/NetworkStatusBanner";
import getLoggedInUser from "@lib/getLoggedInUser";
import {Loading} from "@/components/shell/Loading";
import {Suspense} from "react";

export default async function DashboardPage() {
  const userId = (await getLoggedInUser()).id
  const userData = await getWorkoutData(userId);
  if (!userData) {
    return notFound()
  }

  return <>
    <NetworkStatusBanner/>
    <Suspense fallback={<Loading/>}>
      <WorkoutClient userData={userData}/>
    </Suspense>
  </>
}
