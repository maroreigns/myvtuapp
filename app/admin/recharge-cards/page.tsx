import { AdminRechargeCardForm } from "@/components/AdminRechargeCardForm";
import { BrandWordmark } from "@/components/Logo";
import { prisma } from "@/lib/prisma";

export default async function AdminRechargeCardsPage() {
  const batches = await prisma.rechargeCardBatch.findMany({
    include: { cards: true },
    orderBy: { createdAt: "desc" },
    take: 30
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Recharge Cards</h1>
        <p className="mt-1 text-sm text-slate-500">Admin-only batch creation and printable card sheets.</p>
      </div>
      <AdminRechargeCardForm />
      <div className="space-y-4">
        {batches.map((batch) => (
          <section key={batch.id} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-bold">{batch.name}</h2>
                <p className="text-sm text-slate-500">{batch.network} - NGN {Number(batch.denomination).toLocaleString()} - {batch.cards.length} cards</p>
              </div>
            </div>
            <div className="mt-4 grid gap-3 print:grid-cols-3 sm:grid-cols-2 lg:grid-cols-3">
              {batch.cards.map((card) => (
                <div key={card.id} className="rounded-lg border border-dashed border-slate-300 p-4">
                  <p className="text-xs text-slate-500"><BrandWordmark /> {batch.network}</p>
                  <p className="mt-2 text-lg font-bold">NGN {Number(batch.denomination).toLocaleString()}</p>
                  <p className="mt-2 font-mono text-sm">PIN: {card.pin}</p>
                  <p className="font-mono text-xs text-slate-500">S/N: {card.serialNumber}</p>
                  <p className="mt-2 text-xs font-semibold">{card.status}</p>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
