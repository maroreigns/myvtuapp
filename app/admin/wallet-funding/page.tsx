import { TransactionStatus } from "@prisma/client";
import { AdminPaymentRetryButton } from "@/components/AdminPaymentRetryButton";
import { formatNaira, statusBadgeClass, summarizeProviderResponse } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

export default async function AdminWalletFundingPage({ searchParams }: { searchParams: { status?: string } }) {
  const payments = await prisma.payment.findMany({
    where: searchParams.status ? { status: searchParams.status as TransactionStatus } : {},
    include: { user: { select: { fullName: true, email: true } } },
    orderBy: { createdAt: "desc" },
    take: 200
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Wallet Funding</h1>
        <p className="mt-1 text-sm text-slate-500">Review Paystack wallet payments without exposing raw gateway secrets.</p>
      </div>
      <form className="max-w-xs">
        <select name="status" defaultValue={searchParams.status || ""} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
          <option value="">All statuses</option>
          {Object.values(TransactionStatus).map((status) => <option key={status} value={status}>{status}</option>)}
        </select>
      </form>
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1040px] text-left text-sm">
            <thead className="text-slate-500">
              <tr>
                <th className="py-2">Reference</th>
                <th>User</th>
                <th>Gateway</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Gateway ref</th>
                <th>Receipt</th>
                <th>Summary</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {payments.map((payment) => {
                const receiptHref = payment.status === TransactionStatus.SUCCESSFUL ? `/dashboard/receipts/${payment.reference}` : "";
                return (
                  <tr key={payment.id}>
                    <td className="py-3 font-mono text-xs">{payment.reference}</td>
                    <td>
                      <p className="font-medium">{payment.user.fullName}</p>
                      <p className="text-xs text-slate-500">{payment.user.email}</p>
                    </td>
                    <td>{payment.gateway}</td>
                    <td>{formatNaira(Number(payment.amount))}</td>
                    <td><span className={`rounded-full px-2 py-1 text-xs font-semibold ring-1 ${statusBadgeClass(payment.status)}`}>{payment.status}</span></td>
                    <td className="font-mono text-xs">{payment.gatewayReference || "N/A"}</td>
                    <td>{receiptHref ? <a className="text-brand-700 hover:underline" href={receiptHref}>View receipt</a> : "N/A"}</td>
                    <td className="max-w-[260px] truncate" title={summarizeProviderResponse(payment.rawResponse, payment.failureReason)}>
                      {summarizeProviderResponse(payment.rawResponse, payment.failureReason)}
                    </td>
                    <td>{payment.status === TransactionStatus.PENDING ? <AdminPaymentRetryButton paymentId={payment.id} /> : "N/A"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {payments.length === 0 && <p className="py-8 text-center text-sm text-slate-500">No wallet funding records found.</p>}
        </div>
      </section>
    </div>
  );
}
