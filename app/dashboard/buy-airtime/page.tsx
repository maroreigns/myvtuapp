import { BuyAirtimeForm } from "@/components/BuyAirtimeForm";
import { prisma } from "@/lib/prisma";

export default async function BuyAirtimePage() {
  const pricing = await prisma.airtimePricing.findMany({ orderBy: { network: "asc" } });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Buy Airtime</h1>
        <p className="mt-1 text-sm text-slate-500">Instant top-up for MTN, Airtel, Glo, and 9mobile.</p>
      </div>
      <BuyAirtimeForm pricing={pricing.map((item) => ({ network: item.network, discountPercent: Number(item.discountPercent), isActive: item.isActive }))} />
    </div>
  );
}
