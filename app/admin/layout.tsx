import { AdminShell } from "@/components/AdminShell";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  if (!admin) {
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-16">
        <div className="mx-auto max-w-xl rounded-lg border border-rose-200 bg-white p-6 text-center shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-wide text-rose-600">403</p>
          <h1 className="mt-2 text-2xl font-bold text-slate-950">Admin access required</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">This area is only available to ObmaPay admin users.</p>
        </div>
      </div>
    );
  }

  return <AdminShell>{children}</AdminShell>;
}
