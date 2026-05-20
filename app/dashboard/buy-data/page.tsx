import { BuyDataForm } from "@/components/BuyDataForm";
import { prisma } from "@/lib/prisma";

export default async function BuyDataPage() {
  const plans = await prisma.dataPlan.findMany({ where: { isActive: true }, orderBy: [{ network: "asc" }, { sellingPrice: "asc" }] });
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Buy Data</h1>
        <p className="mt-1 text-sm text-slate-500">Wallet is checked before purchase. Failed provider calls trigger an automatic refund.</p>
      </div>
      <BuyDataForm
        plans={plans.map((plan) => ({
          id: plan.id,
          network: plan.network,
          name: plan.name,
          dataSize: plan.dataSize,
          validity: plan.validity,
          sellingPrice: Number(plan.sellingPrice)
        }))}
      />
    </div>
  );
}
