import {getServerSession} from "next-auth/next";
import {redirect} from "next/navigation";
import {headers} from "next/headers";
import {authOptions} from "@/lib/auth";
import { SettingsProvider } from "@lib/providers/SettingsProvider";
import { AppBarProvider } from "@lib/providers/AppBarProvider";
import { CoachClientsProvider } from "@lib/providers/CoachClientsProvider";
import { NotificationsProvider } from "@lib/providers/NotificationsProvider";
import prisma from '@lib/prisma';
import { parseDashboardSettings } from '@/types/settingsTypes';

export default async function ProtectedLayout({children}: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  const headersList = await headers();
  const isCoachDomain = headersList.get('x-is-coach-domain') === '1';

  if (isCoachDomain) {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { settings: true },
    });
    const settings = parseDashboardSettings(user?.settings);

    if (!settings.coachModeActive) {
      const host = headersList.get('host') ?? '';
      const protocol = headersList.get('x-forwarded-proto') ?? 'https';
      if (host.includes('coach.')) {
        redirect(`${protocol}://${host.replace('coach.', '')}/user/settings`);
      }
      redirect('/user/settings');
    }
  }

  return (
    <SettingsProvider>
      <NotificationsProvider>
        <CoachClientsProvider>
          <AppBarProvider isCoachDomain={isCoachDomain}>
            {children}
          </AppBarProvider>
        </CoachClientsProvider>
      </NotificationsProvider>
    </SettingsProvider>
  );
}
