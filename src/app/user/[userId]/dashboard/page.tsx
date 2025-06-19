import {getUserData} from '@lib/api'; // Server-side data fetching
import DashboardClient from './DashboardClient';
import {notFound} from "next/navigation";
import NetworkStatusBanner from "@/components/NetworkStatusBanner"; // Client component

export default async function DashboardPage({params}: { params: Promise<{ userId: string }> }) {
  const userData = await getUserData((await params).userId);
  if (!userData) {
    return notFound()
  }

  return <>
    <NetworkStatusBanner/>
    <DashboardClient userData={userData}/>
  </>
}