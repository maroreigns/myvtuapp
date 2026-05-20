import { StatCard } from "@/components/StatCard";
import { prisma } from "@/lib/prisma";
import { Banknote, TrendingUp, Wallet } from "lucide-react";

export default async function AdminProfitPage({ searchParams }: { searchParams: { from?: string; to?: string } }) {
  const from = searchParams.from ? new Date(searchParams.from) : undefined;
  const to = searchParams.to ? new Date(searchParams.to) : undefined;
  const where = {
    status: "SUCCESSFUL" as const,
    ...(from || to ? { createdAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {})
  };

  const [total, byNetwork, byService] = await Promise.all([
    prisma.serviceTransaction.aggregate({ where, _sum: { amount: true, providerCost: true, profit: true } }),
    prisma.serviceTransaction.groupBy({ by: ["network"], where, _sum: { profit: true, amount: true } }),
    prisma.serviceTransaction.groupBy({ by: ["serviceType"], where, _sum: { profit: true, amount: true } })
  ]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Profit Report</h1>
        <p className="mt-1 text-sm text-slate-500">Revenue, provider cost, and profit by date range.</p>
      </div>
      <form className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-[1fr_1fr_auto]">
        <input name="from" type="date" defaultValue={searchParams.from} className="rounded-lg border border-slate-300 px-3 py-2" />
        <input name="to" type="date" defaultValue={searchParams.to} className="rounded-lg border border-slate-300 px-3 py-2" />
        <button className="rounded-lg bg-brand-600 px-5 py-2 font-semibold text-white">Filter</button>
      </form>
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Total revenue" value={`NGN ${Number(total._sum.amount || 0).toLocaleString()}`} icon={Banknote} />
        <StatCard label="Provider cost" value={`NGN ${Number(total._sum.providerCost || 0).toLocaleString()}`} icon={Wallet} />
        <StatCard label="Total profit" value={`NGN ${Number(total._sum.profit || 0).toLocaleString()}`} icon={TrendingUp} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-bold">Profit by network</h2>
          <div className="mt-4 divide-y divide-slate-100">
            {byNetwork.map((item) => (
              <div key={item.network || "unknown"} className="flex justify-between py-3 text-sm">
                <span>{item.network || "N/A"}</span>
                <span className="font-semibold">NGN {Number(item._sum.profit || 0).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </section>
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-bold">Profit by service</h2>
          <div className="mt-4 divide-y divide-slate-100">
            {byService.map((item) => (
              <div key={item.serviceType} className="flex justify-between py-3 text-sm">
                <span>{item.serviceType}</span>
                <span className="font-semibold">NGN {Number(item._sum.profit || 0).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
