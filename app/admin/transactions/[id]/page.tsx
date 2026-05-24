import { notFound } from "next/navigation";
import { activeVtuProviderName, formatNaira, statusBadgeClass, summarizeProviderResponse } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

export default async function AdminTransactionDetailPage({ params }: { params: { id: string } }) {
  const transaction = await prisma.serviceTransaction.findUnique({
    where: { id: params.id },
    include: { user: true, plan: true, vtuLogs: { orderBy: { createdAt: "desc" }, take: 10 } }
  });
  if (!transaction) notFound();

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Transaction Detail</h1>
        <p className="mt-1 font-mono text-sm text-slate-500">{transaction.reference}</p>
      </div>
      <section className="grid gap-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm md:grid-cols-2">
        <div>
          <p className="text-xs font-semibold uppercase text-slate-500">User</p>
          <p className="mt-1 font-semibold">{transaction.user.fullName}</p>
          <p className="text-sm text-slate-500">{transaction.user.email} - {transaction.user.phone}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase text-slate-500">Status</p>
          <p className="mt-2"><span className={`rounded-full px-2 py-1 text-xs font-semibold ring-1 ${statusBadgeClass(transaction.status)}`}>{transaction.status}</span></p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase text-slate-500">Service</p>
          <p className="mt-1 font-semibold">{transaction.plan?.name || transaction.serviceType}</p>
          <p className="text-sm text-slate-500">{transaction.network || "N/A"} {transaction.phoneNumber || ""}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase text-slate-500">Amount</p>
          <p className="mt-1 font-semibold">{formatNaira(Number(transaction.amount))}</p>
          <p className="text-sm text-slate-500">Profit {formatNaira(Number(transaction.profit))}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase text-slate-500">Provider reference</p>
          <p className="mt-1 font-mono text-sm">{transaction.providerReference || "N/A"}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase text-slate-500">Response summary</p>
          <p className="mt-1 text-sm">{transaction.responseMessage || "N/A"}</p>
        </div>
      </section>
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-lg font-bold">Provider logs</h2>
        <div className="space-y-3">
          {transaction.vtuLogs.map((log) => (
            <div key={log.id} className="rounded-lg border border-slate-100 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold">{activeVtuProviderName(log.provider)} - {log.serviceType}</p>
                <span className={`rounded-full px-2 py-1 text-xs font-semibold ring-1 ${statusBadgeClass(log.status)}`}>{log.status}</span>
              </div>
              <p className="mt-2 text-sm text-slate-600">{summarizeProviderResponse(log.responsePayload, log.error)}</p>
              <p className="mt-2 text-xs text-slate-400">{log.createdAt.toLocaleString()}</p>
            </div>
          ))}
          {transaction.vtuLogs.length === 0 && <p className="text-sm text-slate-500">No provider logs stored for this transaction.</p>}
        </div>
      </section>
    </div>
  );
}
