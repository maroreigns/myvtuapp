"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function WalletFundForm() {
  const router = useRouter();
  const [reference, setReference] = useState("");
  const [loading, setLoading] = useState(false);

  async function fund(formData: FormData) {
    setLoading(true);
    const response = await fetch("/api/wallet/fund", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: Number(formData.get("amount")), gateway: String(formData.get("gateway")) })
    });
    const data = await response.json();
    setLoading(false);
    if (!response.ok) {
      toast.error(data.error || "Could not initialize payment");
      return;
    }
    setReference(data.payment.reference);
    toast.success("Payment reference generated");
  }

  async function confirm() {
    setLoading(true);
    const response = await fetch("/api/wallet/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reference })
    });
    const data = await response.json();
    setLoading(false);
    if (!response.ok) {
      toast.error(data.error || "Payment confirmation failed");
      return;
    }
    toast.success("Wallet funded successfully");
    setReference("");
    router.refresh();
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <form action={fund} className="grid gap-4 md:grid-cols-[1fr_180px_auto]">
        <input name="amount" type="number" min="100" placeholder="Amount" required className="rounded-lg border border-slate-300 px-3 py-2" />
        <select name="gateway" className="rounded-lg border border-slate-300 px-3 py-2">
          <option value="PAYSTACK">Paystack</option>
          <option value="FLUTTERWAVE">Flutterwave</option>
        </select>
        <button disabled={loading} className="rounded-lg bg-brand-600 px-5 py-2 font-semibold text-white disabled:opacity-60">
          Generate
        </button>
      </form>
      {reference && (
        <div className="mt-4 rounded-lg bg-brand-50 p-4">
          <p className="text-sm text-slate-600">Mock payment reference</p>
          <p className="mt-1 font-mono font-semibold">{reference}</p>
          <button onClick={confirm} disabled={loading} className="mt-3 rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white">
            Confirm mock payment
          </button>
        </div>
      )}
    </div>
  );
}
