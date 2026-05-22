import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatNetwork } from "@/lib/serialize";
import { BrandWordmark } from "@/components/Logo";
import { PrintButton } from "@/components/PrintButton";

export default async function ReceiptPage({ params }: { params: { reference: string } }) {
  const user = await requireUser();
  const [service, wallet] = await Promise.all([
    prisma.serviceTransaction.findFirst({ where: { reference: params.reference, userId: user!.id }, include: { user: true, plan: true } }),
    prisma.walletTransaction.findFirst({ where: { reference: params.reference, userId: user!.id }, include: { user: true } })
  ]);
  const record = service || wallet;
  if (!record || record.status !== "SUCCESSFUL") notFound();

  const rows = service
    ? [
        ["Transaction reference", service.reference],
        ["User name", service.user.fullName],
        ["Service type", service.serviceType],
        ["Network", formatNetwork(service.network)],
        ["Phone number", service.phoneNumber || ""],
        ["Amount", `NGN ${Number(service.amount).toLocaleString()}`],
        ["Status", service.status],
        ["Date/time", service.createdAt.toLocaleString()]
      ]
    : [
        ["Transaction reference", wallet!.reference],
        ["User name", wallet!.user.fullName],
        ["Service type", "Wallet funding"],
        ["Network", ""],
        ["Phone number", ""],
        ["Amount", `NGN ${Number(wallet!.amount).toLocaleString()}`],
        ["Status", wallet!.status],
        ["Date/time", wallet!.createdAt.toLocaleString()]
      ];

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm print:border-0 print:shadow-none">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <p className="text-sm font-semibold text-slate-700"><BrandWordmark /></p>
            <h1 className="mt-1 text-2xl font-bold text-slate-950">Transaction Receipt</h1>
          </div>
          <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">SUCCESSFUL</span>
        </div>
        <dl className="mt-5 divide-y divide-slate-100">
          {rows.map(([label, value]) => (
            <div key={label} className="grid grid-cols-2 gap-4 py-3 text-sm">
              <dt className="text-slate-500">{label}</dt>
              <dd className="text-right font-medium text-slate-900">{value || "N/A"}</dd>
            </div>
          ))}
        </dl>
      </section>
      <div className="print:hidden">
        <PrintButton />
      </div>
    </div>
  );
}
