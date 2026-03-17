import ProtectedLayout from "@/app/protected-layout";
import ServiceWorkerRegistrar from "@/components/ServiceWorkerRegistrar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedLayout>
      <ServiceWorkerRegistrar />
      {children}
    </ProtectedLayout>
  );
}
