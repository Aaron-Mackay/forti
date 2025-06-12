import { getUserData } from '@lib/api'; // Server-side data fetching
import UserDashboardPage from './UserDashboardClient';
import {notFound} from "next/navigation"; // Client component

export default async function DashboardPage({ params }: { params: Promise<{ userId: string }> }) {
  const userData = await getUserData((await params).userId);
  if (!userData) {
    return notFound()
  }

  return <UserDashboardPage userData={userData} />;
}