"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { readApiResponse } from "@/lib/client-response";
import { NETWORKS } from "@/lib/networks";

type Plan = { id: string; network: string; name: string; dataSize: string; validity: string; sellingPrice: number };

export function BuyDataForm({ plans }: { plans: Plan[] }) {
  const router = useRouter();
  const [network, setNetwork] = useState("MTN");
  const [planId, setPlanId] = useState(plans.find((p) => p.network === "MTN")?.id || "");
  const [loading, setLoading] = useState(false);
  const filtered = useMemo(() => plans.filter((plan) => plan.network === network), [network, plans]);
  const selected = plans.find((plan) => plan.id === planId);

  async function submit(formData: FormData) {
    if (!selected || !confirm(`Buy ${selected.name} for ₦${selected.sellingPrice.toLocaleString()}?`)) return;
    setLoading(true);
    try {
      const response = await fetch("/api/data/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId, phoneNumber: String(formData.get("phoneNumber")) })
      });
      const { data, error } = await readApiResponse<{ error?: string; transaction?: { status?: string } }>(response);
      if (!response.ok) {
        toast.error(data.error || error || "Purchase failed");
        return;
      }
      toast.success(data.transaction?.status === "REFUNDED" ? "Provider failed. Wallet refunded." : "Data purchase successful");
      router.refresh();
    } catch {
      toast.error("Could not reach the server. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form action={submit} className="max-w-2xl rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="text-sm font-medium text-slate-700">
          Network
          <select
            value={network}
            onChange={(event) => {
              setNetwork(event.target.value);
              setPlanId(plans.find((p) => p.network === event.target.value)?.id || "");
            }}
            className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2"
          >
            {NETWORKS.map((item) => (
              <option key={item.value} value={item.value}>{item.label}</option>
            ))}
          </select>
        </label>
        <label className="text-sm font-medium text-slate-700">
          Data plan
          <select value={planId} onChange={(event) => setPlanId(event.target.value)} className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2">
            {filtered.map((plan) => (
              <option key={plan.id} value={plan.id}>{plan.name} - ₦{plan.sellingPrice.toLocaleString()}</option>
            ))}
          </select>
        </label>
        <label className="text-sm font-medium text-slate-700 md:col-span-2">
          Phone number
          <input name="phoneNumber" placeholder="08012345678" required className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2" />
        </label>
      </div>
      <div className="mt-5 rounded-lg bg-slate-50 p-4">
        <p className="text-sm text-slate-500">Price</p>
        <p className="text-2xl font-bold text-slate-950">₦{selected?.sellingPrice.toLocaleString() || 0}</p>
      </div>
      <button disabled={loading || !planId} className="mt-5 rounded-lg bg-brand-600 px-5 py-3 font-semibold text-white disabled:opacity-60">
        {loading ? "Processing..." : "Confirm purchase"}
      </button>
    </form>
  );
}
