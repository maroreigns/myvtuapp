import Link from "next/link";
import { redirect } from "next/navigation";
import { WalletFundForm } from "@/components/WalletFundForm";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function WalletPage() {
  const user = await requireUser();
  if (!user) redirect("/login");

  const [history, fundingHistory] = await Promise.all([
    prisma.walletTransaction.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 50 }),
    prisma.payment.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 25 })
  ]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Wallet</h1>
        <p className="mt-1 text-sm text-slate-500">Current balance: NGN {Number(user.walletBalance).toLocaleString()}</p>
      </div>
      <WalletFundForm />
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="font-bold">Wallet funding history</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="text-slate-500">
              <tr><th className="py-2">Reference</th><th>Provider</th><th>Amount</th><th>Status</th><th>Date</th><th>Receipt</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {fundingHistory.map((item) => (
                <tr key={item.id}>
                  <td className="py-3 font-mono text-xs">{item.reference}</td>
                  <td>{item.gateway}</td>
                  <td>NGN {Number(item.amount).toLocaleString()}</td>
                  <td>{item.status}</td>
                  <td>{item.createdAt.toLocaleString()}</td>
                  <td>
                    {item.status === "SUCCESSFUL" ? (
                      <Link className="text-brand-700" href={`/dashboard/receipts/${item.reference}-WALLET`}>View receipt</Link>
                    ) : item.status === "PENDING" && item.gateway === "PAYSTACK" ? (
                      <Link className="text-brand-700" href={`/api/wallet/verify?reference=${item.reference}`}>Retry verification</Link>
                    ) : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {fundingHistory.length === 0 && <p className="py-8 text-center text-sm text-slate-500">No wallet funding attempts yet.</p>}
        </div>
      </section>
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="font-bold">Wallet ledger</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead className="text-slate-500">
              <tr><th className="py-2">Reference</th><th>Type</th><th>Amount</th><th>Balance after</th><th>Status</th><th>Receipt</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {history.map((item) => (
                <tr key={item.id}>
                  <td className="py-3 font-mono text-xs">{item.reference}</td>
                  <td>{item.type}</td>
                  <td>NGN {Number(item.amount).toLocaleString()}</td>
                  <td>NGN {Number(item.balanceAfter).toLocaleString()}</td>
                  <td>{item.status}</td>
                  <td>{item.status === "SUCCESSFUL" ? <Link className="text-brand-700" href={`/dashboard/receipts/${item.reference}`}>View receipt</Link> : "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {history.length === 0 && <p className="py-8 text-center text-sm text-slate-500">No wallet transactions yet.</p>}
        </div>
      </section>
    </div>
  );
}
