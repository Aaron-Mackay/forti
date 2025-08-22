import {getUserData} from '@lib/api'; // Server-side data fetching
import WorkoutClient from './WorkoutClient';
import {notFound} from "next/navigation";
import NetworkStatusBanner from "@/components/NetworkStatusBanner";
import getLoggedInUser from "@lib/getLoggedInUser";

export default async function DashboardPage() {
  const userId = (await getLoggedInUser()).id
  const userData = await getUserData(userId);
  if (!userData) {
    return notFound()
  }

  return <>
    <NetworkStatusBanner/>
    <WorkoutClient userData={userData}/>
  </>
}