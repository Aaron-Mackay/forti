import { getUserData } from '@lib/api'; // Server-side data fetching
import UserDashboardPage from './UserDashboardClient'; // Client component

export default async function DashboardPage({ params }: { params: { userId: string } }) {
  const userData = await getUserData((await params).userId); // Fetch from DB or API

  return <UserDashboardPage userData={userData} />;
}