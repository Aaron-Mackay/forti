import {getServerSession} from "next-auth/next";
import {redirect} from "next/navigation";
import {headers} from "next/headers";
import {authOptions} from "@/lib/auth";
import { SettingsProvider } from "@lib/providers/SettingsProvider";
import { AppBarProvider } from "@lib/providers/AppBarProvider";
import { CoachClientsProvider } from "@lib/providers/CoachClientsProvider";

export default async function ProtectedLayout({children}: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/api/auth/signin");
  }

  const headersList = await headers();
  const isCoachDomain = headersList.get('x-is-coach-domain') === '1';

  return (
    <SettingsProvider>
      <CoachClientsProvider>
        <AppBarProvider isCoachDomain={isCoachDomain}>
          {children}
        </AppBarProvider>
      </CoachClientsProvider>
    </SettingsProvider>
  );
}
