import { AppShell } from "@/components/app-shell";
import { requireLead } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const session = await requireLead();
  return <AppShell session={session}>{children}</AppShell>;
}
