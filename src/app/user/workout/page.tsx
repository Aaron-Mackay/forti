import {getUserData} from '@lib/api'; // Server-side data fetching
import WorkoutClient from './WorkoutClient';
import {notFound} from "next/navigation";
import NetworkStatusBanner from "@/components/NetworkStatusBanner";
import getLoggedInUser from "@lib/getLoggedInUser";
import {Loading} from "@/components/Loading";
import {Suspense} from "react";

export default async function DashboardPage() {
  const userId = (await getLoggedInUser()).id
  const userData = await getUserData(userId);
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