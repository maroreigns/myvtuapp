import { prisma } from "@/lib/prisma";

export default async function AdminWalletTransactionsPage() {
  const transactions = await prisma.walletTransaction.findMany({
    include: { user: true },
    orderBy: { createdAt: "desc" },
    take: 200
  });

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">Wallet Transactions</h1>
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="text-slate-500"><tr><th className="py-2">Reference</th><th>User</th><th>Type</th><th>Amount</th><th>Balance After</th><th>Status</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {transactions.map((item) => (
                <tr key={item.id}>
                  <td className="py-3 font-mono text-xs">{item.reference}</td>
                  <td>{item.user.fullName}</td>
                  <td>{item.type}</td>
                  <td>NGN {Number(item.amount).toLocaleString()}</td>
                  <td>NGN {Number(item.balanceAfter).toLocaleString()}</td>
                  <td>{item.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
