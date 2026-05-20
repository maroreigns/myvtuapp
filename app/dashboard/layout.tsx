import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/DashboardShell";
import { requireUser } from "@/lib/auth";

export default async function UserDashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  if (!user) redirect("/login");

  return <DashboardShell role="USER">{children}</DashboardShell>;
}
