import Link from "next/link";
import { redirect } from "next/navigation";
import { CreditCard, Database, Phone, ReceiptText, Wallet, Zap } from "lucide-react";
import { StatCard } from "@/components/StatCard";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function DashboardPage() {
  const user = await requireUser();
  if (!user) redirect("/login");

  const [recentTransactions, walletCount] = await Promise.all([
    prisma.serviceTransaction.findMany({ where: { userId: user.id }, include: { plan: true }, orderBy: { createdAt: "desc" }, take: 5 }),
    prisma.walletTransaction.count({ where: { userId: user.id } })
  ]);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-slate-500">Welcome back</p>
        <h1 className="text-2xl font-bold text-slate-950">{user.fullName}</h1>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Wallet balance" value={`₦${Number(user.walletBalance).toLocaleString()}`} icon={Wallet} />
        <StatCard label="Recent purchases" value={String(recentTransactions.length)} icon={Database} />
        <StatCard label="Wallet records" value={String(walletCount)} icon={ReceiptText} />
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Link href="/dashboard/buy-airtime" className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm hover:border-brand-500">
          <Phone className="h-6 w-6 text-emerald-600" />
          <h2 className="mt-4 font-bold">Buy airtime</h2>
          <p className="mt-2 text-sm text-slate-500">Instant airtime for every Nigerian network.</p>
        </Link>
        <Link href="/dashboard/buy-data" className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm hover:border-brand-500">
          <Database className="h-6 w-6 text-brand-600" />
          <h2 className="mt-4 font-bold">Buy mobile data</h2>
          <p className="mt-2 text-sm text-slate-500">MTN, Airtel, Glo, and 9mobile plans are ready.</p>
        </Link>
        <Link href="/dashboard/wallet" className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm hover:border-brand-500">
          <CreditCard className="h-6 w-6 text-ocean-600" />
          <h2 className="mt-4 font-bold">Fund wallet</h2>
          <p className="mt-2 text-sm text-slate-500">Fund securely with Paystack test or live keys.</p>
        </Link>
      </div>
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="font-bold">More services</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {[
            "Electricity bills",
            "Cable TV",
            "Betting wallet funding",
            "WAEC/NECO exam pins",
            "Bulk SMS",
            "Airtime-to-cash",
            "Recharge card printing"
          ].map((service) => (
            <Link key={service} href={`/dashboard/services/${service.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-$/, "")}`} className="flex items-center justify-between rounded-lg border border-slate-200 p-4 hover:border-brand-300">
              <span className="flex items-center gap-2 text-sm font-medium text-slate-700"><Zap className="h-4 w-4 text-slate-400" />{service}</span>
              <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-700">Coming Soon</span>
            </Link>
          ))}
        </div>
      </section>
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="font-bold">Recent transactions</h2>
        <div className="mt-4 divide-y divide-slate-100">
          {recentTransactions.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500">No service transactions yet.</p>
          ) : (
            recentTransactions.map((item) => (
              <div key={item.id} className="flex items-center justify-between py-3 text-sm">
                <div>
                  <p className="font-medium">{item.plan?.name || item.serviceType}</p>
                  <p className="text-slate-500">{item.reference}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">₦{Number(item.amount).toLocaleString()}</p>
                  <p className="text-slate-500">{item.status}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
