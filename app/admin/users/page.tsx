import { AdminUserStatusButton } from "@/components/AdminUserStatusButton";
import { AdminWalletForm } from "@/components/AdminWalletForm";
import { prisma } from "@/lib/prisma";

export default async function AdminUsersPage({ searchParams }: { searchParams: { q?: string } }) {
  const q = searchParams.q || "";
  const users = await prisma.user.findMany({
    where: q
      ? { OR: [{ fullName: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }, { phone: { contains: q, mode: "insensitive" } }] }
      : {},
    orderBy: { createdAt: "desc" },
    take: 100
  });

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">Users</h1>
      <form className="max-w-lg">
        <input name="q" defaultValue={q} placeholder="Search name, email or phone" className="w-full rounded-lg border border-slate-300 px-3 py-2" />
      </form>
      <div className="space-y-3">
        {users.map((user) => (
          <div key={user.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-semibold">{user.fullName}</p>
                <p className="text-sm text-slate-500">{user.email} - {user.phone}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`rounded-full px-2 py-1 text-xs font-semibold ${user.isActive ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>
                  {user.isActive ? "Active" : "Inactive"}
                </span>
                <p className="font-bold">NGN {Number(user.walletBalance).toLocaleString()}</p>
              </div>
            </div>
            <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
              <AdminWalletForm userId={user.id} />
              <AdminUserStatusButton userId={user.id} isActive={user.isActive} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
