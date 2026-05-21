import { Banknote, CheckCircle2, TrendingUp, Users, Wallet, XCircle } from "lucide-react";
import { StatCard } from "@/components/StatCard";
import { prisma } from "@/lib/prisma";

export default async function AdminDashboardPage() {
  const [users, wallet, sales, profit, successful, failed] = await Promise.all([
    prisma.user.count(),
    prisma.user.aggregate({ _sum: { walletBalance: true } }),
    prisma.serviceTransaction.aggregate({ where: { status: "SUCCESSFUL" }, _sum: { amount: true } }),
    prisma.serviceTransaction.aggregate({ where: { status: "SUCCESSFUL" }, _sum: { profit: true } }),
    prisma.serviceTransaction.count({ where: { status: "SUCCESSFUL" } }),
    prisma.serviceTransaction.count({ where: { status: "FAILED" } })
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <p className="mt-1 text-sm text-slate-500">Operational overview for Obmapay.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <StatCard label="Total users" value={users.toLocaleString()} icon={Users} />
        <StatCard label="Total wallet balance" value={`₦${Number(wallet._sum.walletBalance || 0).toLocaleString()}`} icon={Wallet} />
        <StatCard label="Total sales" value={`₦${Number(sales._sum.amount || 0).toLocaleString()}`} icon={Banknote} />
        <StatCard label="Total profit" value={`₦${Number(profit._sum.profit || 0).toLocaleString()}`} icon={TrendingUp} />
        <StatCard label="Successful transactions" value={successful.toLocaleString()} icon={CheckCircle2} />
        <StatCard label="Failed transactions" value={failed.toLocaleString()} icon={XCircle} />
      </div>
    </div>
  );
}
