import {getServerSession} from "next-auth/next";
import {redirect} from "next/navigation";
import {authOptions} from "@/lib/auth";
import { SettingsProvider } from "@lib/providers/SettingsProvider";
import { AppBarProvider } from "@lib/providers/AppBarProvider";

export default async function ProtectedLayout({children}: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);

  if (!session) {
    // Redirect to NextAuth signin page
    redirect("/api/auth/signin");
  }

  return (
    <SettingsProvider>
      <AppBarProvider>
        {children}
      </AppBarProvider>
    </SettingsProvider>
  );
}