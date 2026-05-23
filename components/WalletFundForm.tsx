"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { sanitizeAmountInput } from "@/lib/amount-input";
import { readApiResponse } from "@/lib/client-response";

export function WalletFundForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState("");
  const handledStatus = useRef<string | null>(null);

  useEffect(() => {
    const funding = searchParams.get("funding");
    const reference = searchParams.get("reference");
    const key = funding ? `${funding}:${reference || ""}` : null;
    if (!funding || handledStatus.current === key) return;

    handledStatus.current = key;
    if (funding === "success") {
      toast.success("Wallet funded successfully.");
      router.refresh();
      return;
    }
    if (funding === "pending") {
      toast.info(searchParams.get("message") || "Payment received, wallet confirmation is still processing. Please refresh shortly.");
      router.refresh();
      return;
    }
    toast.error(searchParams.get("message") || "Payment verification failed. Your wallet was not credited.");
  }, [router, searchParams]);

  async function fund(formData: FormData) {
    setLoading(true);
    try {
      const response = await fetch("/api/wallet/fund", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: Number(formData.get("amount")) })
      });
      const { data, error } = await readApiResponse<{
        error?: string;
        authorization_url?: string;
        gateway?: { authorizationUrl?: string };
      }>(response);
      if (!response.ok) {
        toast.error(data.error || error || "Could not initialize payment");
        return;
      }
      toast.success("Payment initialized");
      const authorizationUrl = data.authorization_url || data.gateway?.authorizationUrl;
      if (authorizationUrl) {
        window.location.href = authorizationUrl;
        return;
      }
      router.refresh();
    } catch {
      toast.error("Could not reach the server. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const numericAmount = Number(amount);
  const canFund = !loading && amount !== "" && Number.isFinite(numericAmount) && numericAmount >= 100;

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <form action={fund} className="grid gap-4 md:grid-cols-[1fr_auto]">
        <input
          name="amount"
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          min="100"
          placeholder="Amount"
          value={amount}
          onChange={(event) => setAmount(sanitizeAmountInput(event.target.value))}
          required
          className="rounded-lg border border-slate-300 px-3 py-2"
        />
        <button disabled={!canFund} className="rounded-lg bg-brand-600 px-5 py-2 font-semibold text-white disabled:opacity-60">
          {loading ? "Starting..." : "Fund Wallet"}
        </button>
      </form>
      {!canFund && amount ? <p className="mt-3 text-xs text-red-600">Minimum wallet funding amount is NGN 100.</p> : null}
      <p className="mt-3 text-xs text-slate-500">Paystack test mode works when test keys are configured.</p>
    </div>
  );
}
