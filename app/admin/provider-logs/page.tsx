import { TransactionStatus } from "@prisma/client";
import { activeVtuProviderName, statusBadgeClass, summarizeProviderResponse } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

export default async function AdminProviderLogsPage({ searchParams }: { searchParams: { status?: string; provider?: string } }) {
  const logs = await prisma.vtuApiLog.findMany({
    where: {
      ...(searchParams.status ? { status: searchParams.status as TransactionStatus } : {}),
      provider: { not: "easyaccess", ...(searchParams.provider ? { contains: searchParams.provider, mode: "insensitive" } : {}) }
    },
    include: { serviceTransaction: { select: { reference: true, amount: true, user: { select: { fullName: true, email: true } } } } },
    orderBy: { createdAt: "desc" },
    take: 200
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Provider Logs</h1>
        <p className="mt-1 text-sm text-slate-500">VTpass and EasyAccess request outcomes with sensitive fields removed from view.</p>
      </div>
      <form className="grid max-w-2xl gap-3 md:grid-cols-[1fr_1fr_auto]">
        <input name="provider" defaultValue={searchParams.provider || ""} placeholder="Provider" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        <select name="status" defaultValue={searchParams.status || ""} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
          <option value="">All statuses</option>
          {Object.values(TransactionStatus).map((status) => <option key={status} value={status}>{status}</option>)}
        </select>
        <button className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white">Filter</button>
      </form>
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="text-slate-500">
              <tr>
                <th className="py-2">Date</th>
                <th>Provider</th>
                <th>Service</th>
                <th>Reference</th>
                <th>Status</th>
                <th>Error</th>
                <th>Response summary</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.map((log) => (
                <tr key={log.id}>
                  <td className="py-3 text-xs text-slate-500">{log.createdAt.toLocaleString()}</td>
                  <td className="font-semibold">{activeVtuProviderName(log.provider)}</td>
                  <td>{log.serviceType}</td>
                  <td className="font-mono text-xs">{log.serviceTransaction?.reference || "N/A"}</td>
                  <td><span className={`rounded-full px-2 py-1 text-xs font-semibold ring-1 ${statusBadgeClass(log.status)}`}>{log.status}</span></td>
                  <td className="max-w-[220px] truncate" title={log.error || ""}>{log.error || "N/A"}</td>
                  <td className="max-w-[320px] truncate" title={summarizeProviderResponse(log.responsePayload)}>
                    {summarizeProviderResponse(log.responsePayload)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {logs.length === 0 && <p className="py-8 text-center text-sm text-slate-500">No provider logs found.</p>}
        </div>
      </section>
    </div>
  );
}
