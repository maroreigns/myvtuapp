import { AdminTransactionActions } from "@/components/AdminTransactionActions";
import { prisma } from "@/lib/prisma";

export default async function AdminTransactionsPage({ searchParams }: { searchParams: { status?: string } }) {
  const transactions = await prisma.serviceTransaction.findMany({
    where: searchParams.status ? { status: searchParams.status as never } : {},
    include: { user: true, plan: true },
    orderBy: { createdAt: "desc" },
    take: 200
  });

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">Admin Transactions</h1>
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="text-slate-500"><tr><th className="py-2">Reference</th><th>User</th><th>Plan</th><th>Amount</th><th>Profit</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {transactions.map((item) => (
                <tr key={item.id}>
                  <td className="py-3 font-mono text-xs">{item.reference}</td>
                  <td>{item.user.fullName}</td>
                  <td>{item.plan?.name || item.serviceType}</td>
                  <td>₦{Number(item.amount).toLocaleString()}</td>
                  <td>₦{Number(item.profit).toLocaleString()}</td>
                  <td>{item.status}</td>
                  <td><AdminTransactionActions id={item.id} /></td>
                </tr>
              ))}
            </tbody>
          </table>
          {transactions.length === 0 && <p className="py-8 text-center text-sm text-slate-500">No transactions found.</p>}
        </div>
      </section>
    </div>
  );
}
