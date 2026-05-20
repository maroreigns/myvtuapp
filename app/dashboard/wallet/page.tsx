import { WalletFundForm } from "@/components/WalletFundForm";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function WalletPage() {
  const user = await requireUser();
  const history = await prisma.walletTransaction.findMany({ where: { userId: user!.id }, orderBy: { createdAt: "desc" }, take: 50 });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Wallet</h1>
        <p className="mt-1 text-sm text-slate-500">Current balance: ₦{Number(user!.walletBalance).toLocaleString()}</p>
      </div>
      <WalletFundForm />
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="font-bold">Funding and wallet history</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead className="text-slate-500">
              <tr><th className="py-2">Reference</th><th>Type</th><th>Amount</th><th>Balance after</th><th>Status</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {history.map((item) => (
                <tr key={item.id}>
                  <td className="py-3 font-mono text-xs">{item.reference}</td>
                  <td>{item.type}</td>
                  <td>₦{Number(item.amount).toLocaleString()}</td>
                  <td>₦{Number(item.balanceAfter).toLocaleString()}</td>
                  <td>{item.status}</td>
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
