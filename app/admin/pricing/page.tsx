import { AdminPlanForm } from "@/components/AdminPlanForm";
import { prisma } from "@/lib/prisma";

export default async function AdminPricingPage() {
  const plans = await prisma.dataPlan.findMany({ orderBy: [{ network: "asc" }, { sellingPrice: "asc" }] });
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">Pricing</h1>
      <AdminPlanForm />
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="text-slate-500"><tr><th className="py-2">Network</th><th>Name</th><th>Code</th><th>Cost</th><th>Price</th><th>Margin</th><th>Active</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {plans.map((plan) => (
                <tr key={plan.id}>
                  <td className="py-3">{plan.network}</td>
                  <td>{plan.name}</td>
                  <td className="font-mono text-xs">{plan.providerCode}</td>
                  <td>₦{Number(plan.providerCost).toLocaleString()}</td>
                  <td>₦{Number(plan.sellingPrice).toLocaleString()}</td>
                  <td>₦{Number(plan.sellingPrice.minus(plan.providerCost)).toLocaleString()}</td>
                  <td>{plan.isActive ? "Yes" : "No"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
