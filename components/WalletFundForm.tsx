"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { readApiResponse } from "@/lib/client-response";

export function WalletFundForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function fund(formData: FormData) {
    setLoading(true);
    try {
      const response = await fetch("/api/wallet/fund", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: Number(formData.get("amount")), gateway: String(formData.get("gateway")) })
      });
      const { data, error } = await readApiResponse<{ error?: string; gateway?: { authorizationUrl?: string } }>(response);
      if (!response.ok) {
        toast.error(data.error || error || "Could not initialize payment");
        return;
      }
      toast.success("Payment initialized");
      if (data.gateway?.authorizationUrl) {
        window.location.href = data.gateway.authorizationUrl;
        return;
      }
      router.refresh();
    } catch {
      toast.error("Could not reach the server. Please try again.");
    } finally {
      setLoading(false);
    }
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
          {loading ? "Starting..." : "Fund wallet"}
        </button>
      </form>
      <p className="mt-3 text-xs text-slate-500">Paystack test mode works when test keys are configured. Mock fallback redirects back for local development.</p>
    </div>
  );
}
