import {getServerSession} from "next-auth/next";
import {redirect} from "next/navigation";
import {headers} from "next/headers";
import {authOptions} from "@/lib/auth";
import { SettingsProvider } from "@lib/providers/SettingsProvider";
import { CoachClientsProvider } from "@lib/providers/CoachClientsProvider";
import { NotificationsProvider } from "@lib/providers/NotificationsProvider";
import { SignalShellSwitch } from "@/components/signal/SignalShellSwitch";
import { DateLocalizationProvider } from "@/lib/providers/DateLocalizationProvider";
import prisma from '@lib/prisma';
import { parseDashboardSettings } from '@/types/settingsTypes';
import AuthProvider from '@lib/providers/AuthProvider';

function computeInitials(input: string | null | undefined): string {
  if (!input) return '·';
  const parts = input.split(/[\s@.]+/).filter(Boolean).slice(0, 2);
  const initials = parts.map((p) => p[0]?.toUpperCase() ?? '').join('');
  return initials || '·';
}

export default async function ProtectedLayout({children}: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  const headersList = await headers();
  const isCoachDomain = headersList.get('x-is-coach-domain') === '1';

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { settings: true },
  });
  const settings = parseDashboardSettings(user?.settings);

  if (isCoachDomain && !settings.coachModeActive) {
    redirect('/user/settings');
  }

  const userLabel = session.user.name ?? session.user.email ?? undefined;
  const userInitials = computeInitials(session.user.name ?? session.user.email);

  return (
    <AuthProvider session={session}>
      <DateLocalizationProvider>
        <SettingsProvider>
          <NotificationsProvider>
            <CoachClientsProvider>
              <SignalShellSwitch
                signalEnabled={settings.signalUiEnabled}
                userLabel={userLabel}
                userInitials={userInitials}
              >
                {children}
              </SignalShellSwitch>
            </CoachClientsProvider>
          </NotificationsProvider>
        </SettingsProvider>
      </DateLocalizationProvider>
    </AuthProvider>
  );
}
