"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { readApiResponse } from "@/lib/client-response";
import { NETWORKS, networkLabel } from "@/lib/networks";

type Pricing = { network: string; discountPercent: number; isActive: boolean };

export function BuyAirtimeForm({ pricing }: { pricing: Pricing[] }) {
  const router = useRouter();
  const networkOptions = [...NETWORKS];
  const [network, setNetwork] = useState("MTN");
  const [amount, setAmount] = useState(100);
  const [loading, setLoading] = useState(false);
  const selected = pricing.find((item) => item.network === network) || { network, discountPercent: 0, isActive: true };
  const payable = amount - amount * ((selected?.discountPercent || 0) / 100);

  async function submit(formData: FormData) {
    const phoneNumber = String(formData.get("phoneNumber") || "").trim();
    if (!network) {
      toast.error("Please select a network");
      return;
    }
    if (!phoneNumber) {
      toast.error("Phone number is required");
      return;
    }
    if (!amount || amount <= 0) {
      toast.error("Amount must be greater than 0");
      return;
    }
    if (!selected?.isActive) {
      toast.error("Airtime is not active for this network");
      return;
    }
    if (!confirm(`Buy ${networkLabel(network)} airtime for NGN ${payable.toLocaleString()}?`)) return;
    setLoading(true);
    try {
      const response = await fetch("/api/airtime/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          network,
          amount,
          phoneNumber
        })
      });
      const { data, error } = await readApiResponse<{ error?: string; transaction?: { status?: string } }>(response);
      if (!response.ok) {
        toast.error(data.error || error || "Airtime purchase failed");
        return;
      }
      if (data.transaction?.status === "FAILED") {
        toast.error("Provider failed. Your wallet was not debited.");
      } else {
        toast.success("Airtime purchase successful");
      }
      router.refresh();
    } catch {
      toast.error("Could not reach the server. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form action={submit} className="max-w-2xl rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      {networkOptions.length === 0 && (
        <div className="mb-4 rounded-lg bg-amber-50 p-4 text-sm text-amber-700">
          No airtime networks are available right now.
        </div>
      )}
      <div className="grid gap-4 md:grid-cols-2">
        <label className="text-sm font-medium text-slate-700">
          Network
          <select
            required
            value={network}
            onChange={(event) => setNetwork(event.target.value)}
            disabled={loading || networkOptions.length === 0}
            className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 disabled:bg-slate-100"
          >
            {networkOptions.map((item) => (
              <option key={item.value} value={item.value}>{item.label}</option>
            ))}
          </select>
        </label>
        <label className="text-sm font-medium text-slate-700">
          Amount
          <input
            required
            value={amount}
            onChange={(event) => setAmount(Number(event.target.value))}
            type="number"
            min="1"
            disabled={loading}
            className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 disabled:bg-slate-100"
          />
        </label>
        <label className="text-sm font-medium text-slate-700 md:col-span-2">
          Phone number
          <input name="phoneNumber" placeholder="08012345678" required disabled={loading} className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 disabled:bg-slate-100" />
        </label>
      </div>
      <div className="mt-5 rounded-lg bg-slate-50 p-4">
        <p className="text-sm text-slate-500">Wallet debit</p>
        <p className="text-2xl font-bold text-slate-950">NGN {payable.toLocaleString()}</p>
      </div>
      {pricing.length === 0 && (
        <p className="mt-3 text-xs text-slate-500">Default airtime pricing is being used until admin pricing is configured.</p>
      )}
      <button disabled={loading || networkOptions.length === 0 || !selected?.isActive || amount <= 0} className="mt-5 rounded-lg bg-brand-600 px-5 py-3 font-semibold text-white disabled:opacity-60">
        {loading ? "Processing..." : "Confirm purchase"}
      </button>
    </form>
  );
}
