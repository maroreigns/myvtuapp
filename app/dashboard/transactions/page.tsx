import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function TransactionsPage({ searchParams }: { searchParams: { status?: string; type?: string } }) {
  const user = await requireUser();
  if (!user) redirect("/login");

  const transactions = await prisma.serviceTransaction.findMany({
    where: {
      userId: user.id,
      ...(searchParams.status ? { status: searchParams.status as never } : {}),
      ...(searchParams.type ? { serviceType: searchParams.type as never } : {})
    },
    include: { plan: true },
    orderBy: { createdAt: "desc" },
    take: 100
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Transactions</h1>
        <p className="mt-1 text-sm text-slate-500">Filter by appending status or type query parameters.</p>
      </div>
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="text-slate-500">
              <tr><th className="py-2">Reference</th><th>Service</th><th>Plan</th><th>Phone</th><th>Amount</th><th>Status</th><th>Date</th><th>Receipt</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {transactions.map((item) => (
                <tr key={item.id}>
                  <td className="py-3 font-mono text-xs">{item.reference}</td>
                  <td>{item.serviceType}</td>
                  <td>{item.plan?.name || "-"}</td>
                  <td>{item.phoneNumber || "-"}</td>
                  <td>₦{Number(item.amount).toLocaleString()}</td>
                  <td>{item.status}</td>
                  <td>{item.createdAt.toLocaleDateString()}</td>
                  <td>{item.status === "SUCCESSFUL" ? <Link className="text-brand-700" href={`/dashboard/receipts/${item.reference}`}>View receipt</Link> : "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {transactions.length === 0 && <p className="py-8 text-center text-sm text-slate-500">No matching transactions.</p>}
        </div>
      </section>
    </div>
  );
}
