import Link from "next/link";
import { Banknote, CheckCircle2, Clock3, CreditCard, Database, ReceiptText, Users, Wallet, XCircle } from "lucide-react";
import { TransactionStatus } from "@prisma/client";
import { StatCard } from "@/components/StatCard";
import { activeVtuProviderName, formatNaira, statusBadgeClass, summarizeProviderResponse } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

export default async function AdminDashboardPage() {
  const [
    totalUsers,
    walletAggregate,
    totalTransactions,
    fundingAggregate,
    purchaseAggregate,
    successfulTransactions,
    failedTransactions,
    pendingFunding,
    recentUsers,
    recentTransactions
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.aggregate({ _sum: { walletBalance: true } }),
    prisma.serviceTransaction.count(),
    prisma.payment.aggregate({ where: { status: TransactionStatus.SUCCESSFUL }, _sum: { amount: true } }),
    prisma.serviceTransaction.aggregate({ _sum: { amount: true } }),
    prisma.serviceTransaction.count({ where: { status: TransactionStatus.SUCCESSFUL } }),
    prisma.serviceTransaction.count({ where: { status: TransactionStatus.FAILED } }),
    prisma.payment.count({ where: { status: TransactionStatus.PENDING } }),
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: { id: true, fullName: true, email: true, role: true, isActive: true, walletBalance: true, createdAt: true },
      take: 6
    }),
    prisma.serviceTransaction.findMany({
      include: { user: { select: { fullName: true, email: true } }, vtuLogs: { orderBy: { createdAt: "desc" }, take: 1 } },
      orderBy: { createdAt: "desc" },
      take: 8
    })
  ]);

  const quickActions = [
    { href: "/admin/users", label: "Manage users", icon: Users },
    { href: "/admin/transactions", label: "Review transactions", icon: ReceiptText },
    { href: "/admin/wallet-funding", label: "Wallet funding", icon: Wallet },
    { href: "/admin/pricing", label: "Data plans", icon: Database },
    { href: "/admin/recharge-cards", label: "Recharge cards", icon: CreditCard }
  ];

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">
        ADMIN DASHBOARD
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-950">Admin Overview</h1>
          <p className="mt-1 text-sm text-slate-500">Platform operations, wallet activity, users, and transaction health.</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total users" value={totalUsers.toLocaleString()} icon={Users} />
        <StatCard label="Total wallet balance" value={formatNaira(Number(walletAggregate._sum.walletBalance || 0))} icon={Wallet} />
        <StatCard label="Total transactions" value={totalTransactions.toLocaleString()} icon={ReceiptText} />
        <StatCard label="Total funding" value={formatNaira(Number(fundingAggregate._sum.amount || 0))} icon={Banknote} />
        <StatCard label="Total purchases" value={formatNaira(Number(purchaseAggregate._sum.amount || 0))} icon={CreditCard} />
        <StatCard label="Successful transactions" value={successfulTransactions.toLocaleString()} icon={CheckCircle2} />
        <StatCard label="Failed transactions" value={failedTransactions.toLocaleString()} icon={XCircle} />
        <StatCard label="Pending wallet funding" value={pendingFunding.toLocaleString()} icon={Clock3} />
      </div>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold text-slate-950">Quick actions</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {quickActions.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href} className="flex items-center gap-3 rounded-lg border border-slate-200 p-4 text-sm font-semibold text-slate-700 transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700">
                <Icon className="h-5 w-5 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-slate-950">Recent users</h2>
          <div className="mt-4 space-y-3">
            {recentUsers.map((user) => (
              <div key={user.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900">{user.fullName}</p>
                  <p className="truncate text-xs text-slate-500">{user.email}</p>
                </div>
                <div className="shrink-0 text-right">
                  <span className={`rounded-full px-2 py-1 text-xs font-semibold ${user.isActive ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>
                    {user.role}
                  </span>
                  <p className="mt-1 text-xs text-slate-500">{formatNaira(Number(user.walletBalance))}</p>
                </div>
              </div>
            ))}
            {recentUsers.length === 0 && <p className="py-6 text-center text-sm text-slate-500">No users found.</p>}
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-slate-950">Recent transactions</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="text-slate-500">
                <tr>
                  <th className="py-2">Reference</th>
                  <th>User</th>
                  <th>Service</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Summary</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentTransactions.map((item) => {
                  const latestLog = item.vtuLogs[0];
                  const summary = summarizeProviderResponse(latestLog?.responsePayload, item.responseMessage);
                  return (
                    <tr key={item.id}>
                      <td className="py-3 font-mono text-xs">{item.reference}</td>
                      <td>
                        <p className="font-medium text-slate-900">{item.user.fullName}</p>
                        <p className="text-xs text-slate-500">{item.user.email}</p>
                      </td>
                      <td>{item.serviceType}</td>
                      <td>{formatNaira(Number(item.amount))}</td>
                      <td><span className={`rounded-full px-2 py-1 text-xs font-semibold ring-1 ${statusBadgeClass(item.status)}`}>{item.status}</span></td>
                      <td className="max-w-[220px] truncate" title={`${activeVtuProviderName(latestLog?.provider)} - ${summary}`}>{activeVtuProviderName(latestLog?.provider)} - {summary}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {recentTransactions.length === 0 && <p className="py-8 text-center text-sm text-slate-500">No transactions yet.</p>}
          </div>
        </section>
      </div>
    </div>
  );
}
