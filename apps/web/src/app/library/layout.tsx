import ProtectedLayout from "@/app/protected-layout";

export default function LibraryLayout({ children }: { children: React.ReactNode }) {
  return <ProtectedLayout>{children}</ProtectedLayout>;
}
