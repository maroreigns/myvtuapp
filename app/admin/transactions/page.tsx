import Link from "next/link";
import { ServiceType, TransactionStatus } from "@prisma/client";
import { AdminTransactionActions } from "@/components/AdminTransactionActions";
import { activeVtuProviderName, formatNaira, statusBadgeClass, summarizeProviderResponse } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

function objectValue(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function textValue(value: unknown) {
  return value === undefined || value === null || value === "" ? "N/A" : String(value);
}

export default async function AdminTransactionsPage({
  searchParams
}: {
  searchParams: { status?: string; service?: string; provider?: string; from?: string; to?: string };
}) {
  const where = {
    ...(searchParams.status ? { status: searchParams.status as TransactionStatus } : {}),
    ...(searchParams.service ? { serviceType: searchParams.service as ServiceType } : {}),
    ...(searchParams.from || searchParams.to
      ? {
          createdAt: {
            ...(searchParams.from ? { gte: new Date(searchParams.from) } : {}),
            ...(searchParams.to ? { lte: new Date(`${searchParams.to}T23:59:59.999Z`) } : {})
          }
        }
      : {})
  };

  const transactions = await prisma.serviceTransaction.findMany({
    where,
    include: { user: true, plan: true, vtuLogs: { orderBy: { createdAt: "desc" }, take: 1 } },
    orderBy: { createdAt: "desc" },
    take: 200
  });

  const filtered = searchParams.provider
    ? transactions.filter((item) => {
        const metadata = objectValue(item.metadata);
        const latestLog = item.vtuLogs[0];
        return textValue(metadata.provider || latestLog?.provider).toLowerCase().includes(searchParams.provider!.toLowerCase());
      })
    : transactions;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Transactions</h1>
        <p className="mt-1 text-sm text-slate-500">Filter purchases and inspect sanitized provider response summaries.</p>
      </div>
      <form className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-5">
        <select name="status" defaultValue={searchParams.status || ""} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
          <option value="">All statuses</option>
          {Object.values(TransactionStatus).map((status) => <option key={status} value={status}>{status}</option>)}
        </select>
        <select name="service" defaultValue={searchParams.service || ""} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
          <option value="">All services</option>
          {Object.values(ServiceType).map((service) => <option key={service} value={service}>{service}</option>)}
        </select>
        <input name="provider" defaultValue={searchParams.provider || ""} placeholder="Provider" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        <input name="from" defaultValue={searchParams.from || ""} type="date" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        <div className="flex gap-2">
          <input name="to" defaultValue={searchParams.to || ""} type="date" className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          <button className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white">Filter</button>
        </div>
      </form>
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1180px] text-left text-sm">
            <thead className="text-slate-500">
              <tr>
                <th className="py-2">Reference</th>
                <th>User</th>
                <th>Service</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Provider</th>
                <th>Provider response summary</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((item) => {
                const latestLog = item.vtuLogs[0];
                const metadata = objectValue(item.metadata);
                const provider = activeVtuProviderName(textValue(metadata.provider || latestLog?.provider));
                const responseText = summarizeProviderResponse(latestLog?.responsePayload, item.responseMessage);
                return (
                  <tr key={item.id}>
                    <td className="py-3 font-mono text-xs">
                      <Link className="text-brand-700 hover:underline" href={`/admin/transactions/${item.id}`}>{item.reference}</Link>
                    </td>
                    <td>
                      <p className="font-medium">{item.user.fullName}</p>
                      <p className="text-xs text-slate-500">{item.user.email}</p>
                    </td>
                    <td>{item.plan?.name || item.serviceType}</td>
                    <td>{formatNaira(Number(item.amount))}</td>
                    <td><span className={`rounded-full px-2 py-1 text-xs font-semibold ring-1 ${statusBadgeClass(item.status)}`}>{item.status}</span></td>
                    <td>{provider}</td>
                    <td className="max-w-[320px] truncate" title={responseText}>{responseText}</td>
                    <td><AdminTransactionActions id={item.id} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && <p className="py-8 text-center text-sm text-slate-500">No transactions found.</p>}
        </div>
      </section>
    </div>
  );
}
