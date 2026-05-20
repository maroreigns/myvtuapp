"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { readApiResponse } from "@/lib/client-response";

export function AdminPlanForm() {
  const router = useRouter();
  async function submit(formData: FormData) {
    const response = await fetch("/api/admin/plans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        network: String(formData.get("network")),
        name: String(formData.get("name")),
        dataSize: String(formData.get("dataSize")),
        validity: String(formData.get("validity")),
        providerCode: String(formData.get("providerCode")),
        providerCost: Number(formData.get("providerCost")),
        sellingPrice: Number(formData.get("sellingPrice")),
        isActive: true
      })
    });
    const { data, error } = await readApiResponse<{ error?: string }>(response);
    response.ok ? toast.success("Plan added") : toast.error(data.error || error || "Could not add plan");
    router.refresh();
  }

  return (
    <form action={submit} className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-4">
      <select name="network" className="rounded-lg border border-slate-300 px-3 py-2"><option>MTN</option><option>AIRTEL</option><option>GLO</option><option value="NINE_MOBILE">9mobile</option></select>
      <input name="name" placeholder="Plan name" className="rounded-lg border border-slate-300 px-3 py-2" />
      <input name="dataSize" placeholder="1GB" className="rounded-lg border border-slate-300 px-3 py-2" />
      <input name="validity" placeholder="30 days" className="rounded-lg border border-slate-300 px-3 py-2" />
      <input name="providerCode" placeholder="Provider code" className="rounded-lg border border-slate-300 px-3 py-2" />
      <input name="providerCost" type="number" placeholder="Provider cost" className="rounded-lg border border-slate-300 px-3 py-2" />
      <input name="sellingPrice" type="number" placeholder="Selling price" className="rounded-lg border border-slate-300 px-3 py-2" />
      <button className="rounded-lg bg-brand-600 px-4 py-2 font-semibold text-white">Add plan</button>
    </form>
  );
}
