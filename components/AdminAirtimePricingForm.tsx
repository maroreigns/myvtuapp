"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { readApiResponse } from "@/lib/client-response";

export function AdminAirtimePricingForm({ pricing }: { pricing: { network: string; discountPercent: number; providerCostPercent: number; isActive: boolean }[] }) {
  const router = useRouter();

  async function submit(formData: FormData) {
    const response = await fetch("/api/admin/airtime-pricing", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        network: String(formData.get("network")),
        discountPercent: Number(formData.get("discountPercent")),
        providerCostPercent: Number(formData.get("providerCostPercent")),
        isActive: formData.get("isActive") === "on"
      })
    });
    const { data, error } = await readApiResponse<{ error?: string }>(response);
    response.ok ? toast.success("Airtime pricing updated") : toast.error(data.error || error || "Could not update pricing");
    router.refresh();
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="font-bold">Airtime pricing</h2>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {pricing.map((item) => (
          <form key={item.network} action={submit} className="rounded-lg border border-slate-200 p-4">
            <input type="hidden" name="network" value={item.network} />
            <div className="mb-3 flex items-center justify-between">
              <p className="font-semibold">{item.network === "NINE_MOBILE" ? "9mobile" : item.network}</p>
              <label className="text-xs text-slate-500"><input name="isActive" type="checkbox" defaultChecked={item.isActive} className="mr-1" /> Active</label>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <input name="discountPercent" type="number" step="0.01" defaultValue={item.discountPercent} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="User discount %" />
              <input name="providerCostPercent" type="number" step="0.01" defaultValue={item.providerCostPercent} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Provider cost %" />
            </div>
            <button className="mt-3 rounded-lg bg-slate-950 px-4 py-2 text-xs font-semibold text-white">Save</button>
          </form>
        ))}
      </div>
    </section>
  );
}
