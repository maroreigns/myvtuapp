import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/DashboardShell";
import { requireAdmin } from "@/lib/auth";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  if (!admin) redirect("/dashboard");

  return <DashboardShell role="ADMIN">{children}</DashboardShell>;
}
