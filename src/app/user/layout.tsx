import ProtectedLayout from "@/app/protected-layout";
import { SettingsProvider } from "@lib/providers/SettingsProvider";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedLayout>
      <SettingsProvider>
        {children}
      </SettingsProvider>
    </ProtectedLayout>
  );
}
