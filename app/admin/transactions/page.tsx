import { AdminTransactionActions } from "@/components/AdminTransactionActions";
import Link from "next/link";
import { prisma } from "@/lib/prisma";

function objectValue(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function textValue(value: unknown) {
  return value === undefined || value === null || value === "" ? "N/A" : String(value);
}

function compactJson(value: unknown) {
  if (!value) return "";
  try {
    return JSON.stringify(value);
  } catch {
    return "";
  }
}

export default async function AdminTransactionsPage({ searchParams }: { searchParams: { status?: string } }) {
  const transactions = await prisma.serviceTransaction.findMany({
    where: searchParams.status ? { status: searchParams.status as never } : {},
    include: { user: true, plan: true, vtuLogs: { orderBy: { createdAt: "desc" }, take: 1 } },
    orderBy: { createdAt: "desc" },
    take: 200
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Admin Transactions</h1>
        <p className="mt-1 text-sm text-slate-500">Review all purchases, provider references, provider responses, and profit.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {[
          { label: "All transactions", href: "/admin/transactions" },
          { label: "Successful", href: "/admin/transactions?status=SUCCESSFUL" },
          { label: "Failed", href: "/admin/transactions?status=FAILED" },
          { label: "Pending", href: "/admin/transactions?status=PENDING" }
        ].map((item) => (
          <Link key={item.href} href={item.href} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-brand-200 hover:text-brand-700">
            {item.label}
          </Link>
        ))}
      </div>
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1180px] text-left text-sm">
            <thead className="text-slate-500">
              <tr>
                <th className="py-2">Reference</th>
                <th>User</th>
                <th>Service</th>
                <th>Network</th>
                <th>Amount</th>
                <th>Profit</th>
                <th>Status</th>
                <th>Provider</th>
                <th>Request ID</th>
                <th>Provider Ref</th>
                <th>Provider Response</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {transactions.map((item) => {
                const latestLog = item.vtuLogs[0];
                const metadata = objectValue(item.metadata);
                const provider = textValue(metadata.provider || latestLog?.provider);
                const requestId = textValue(metadata.requestId || item.reference);
                const transactionId = textValue(metadata.transactionId || item.providerReference);
                const responseText = latestLog?.error || compactJson(latestLog?.responsePayload) || item.responseMessage || "";
                return (
                  <tr key={item.id}>
                    <td className="py-3 font-mono text-xs">{item.reference}</td>
                    <td>{item.user.fullName}</td>
                    <td>{item.plan?.name || item.serviceType}</td>
                    <td>{item.network || "N/A"}</td>
                    <td>NGN {Number(item.amount).toLocaleString()}</td>
                    <td>NGN {Number(item.profit).toLocaleString()}</td>
                    <td>{item.status}</td>
                    <td>{provider}</td>
                    <td className="max-w-[180px] truncate font-mono text-xs" title={requestId}>{requestId}</td>
                    <td className="max-w-[160px] truncate font-mono text-xs" title={transactionId}>{transactionId}</td>
                    <td className="max-w-[260px] truncate" title={responseText}>{responseText || "N/A"}</td>
                    <td><AdminTransactionActions id={item.id} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {transactions.length === 0 && <p className="py-8 text-center text-sm text-slate-500">No transactions found.</p>}
        </div>
      </section>
    </div>
  );
}
