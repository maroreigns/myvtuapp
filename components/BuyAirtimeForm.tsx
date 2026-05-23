"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { sanitizeAmountInput } from "@/lib/amount-input";
import { readApiResponse } from "@/lib/client-response";
import { detectNetwork, normalizeNigerianPhone } from "@/lib/network-detection";
import { NETWORKS, networkLabel } from "@/lib/networks";
import { PurchaseSuccessModal } from "@/components/PurchaseSuccessModal";

type Pricing = { network: string; discountPercent: number; isActive: boolean };
type SuccessState = { amount: number; serviceType: string; reference: string } | null;

export function BuyAirtimeForm({ pricing }: { pricing: Pricing[] }) {
  const router = useRouter();
  const networkOptions = [...NETWORKS];
  const [network, setNetwork] = useState("MTN");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [amountInput, setAmountInput] = useState("100");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<SuccessState>(null);
  const selected = pricing.find((item) => item.network === network) || { network, discountPercent: 0, isActive: true };
  const amount = Number(amountInput);
  const payable = amount - amount * ((selected?.discountPercent || 0) / 100);
  const normalizedPhone = normalizeNigerianPhone(phoneNumber);
  const detectedNetwork = detectNetwork(phoneNumber);
  const hasNetworkMismatch = Boolean(detectedNetwork && detectedNetwork !== network);

  function updatePhoneNumber(value: string) {
    setPhoneNumber(value);
    const detected = detectNetwork(value);
    if (detected && !phoneNumber.trim()) setNetwork(detected);
  }

  async function submit(formData: FormData) {
    if (!network) {
      toast.error("Please select a network");
      return;
    }
    if (!normalizedPhone) {
      toast.error("Phone number is required");
      return;
    }
    if (hasNetworkMismatch) {
      toast.error("This phone number does not match selected network.");
      return;
    }
    if (!amountInput || !Number.isFinite(amount) || amount <= 0) {
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
          phoneNumber: normalizedPhone
        })
      });
      const { data, error } = await readApiResponse<{
        error?: string;
        success?: boolean;
        amount?: number;
        reference?: string;
        message?: string;
        transaction?: { status?: string; amount?: number; reference?: string };
      }>(response);
      if (!response.ok) {
        toast.error(data.error || error || "Airtime purchase failed");
        return;
      }
      if (data.transaction?.status === "FAILED") {
        toast.error("Provider failed. Your wallet was not debited.");
      } else {
        setSuccess({
          amount: data.amount ?? data.transaction?.amount ?? payable,
          serviceType: data.message || "Airtime purchase successful",
          reference: data.reference || data.transaction?.reference || ""
        });
      }
      router.refresh();
    } catch {
      toast.error("Could not reach the server. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
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
            value={amountInput}
            onChange={(event) => setAmountInput(sanitizeAmountInput(event.target.value))}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            min="1"
            disabled={loading}
            className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 disabled:bg-slate-100"
          />
        </label>
        <label className="text-sm font-medium text-slate-700 md:col-span-2">
          Phone number
          <input
            name="phoneNumber"
            value={phoneNumber}
            onChange={(event) => updatePhoneNumber(event.target.value)}
            placeholder="08012345678"
            required
            disabled={loading}
            className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 disabled:bg-slate-100"
          />
          {detectedNetwork && (
            <span className="mt-2 inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
              Detected network: {networkLabel(detectedNetwork)}
            </span>
          )}
          {hasNetworkMismatch && (
            <p className="mt-2 text-sm font-medium text-red-600">
              This number appears to be a {networkLabel(detectedNetwork!)} number, not {networkLabel(network)}.
            </p>
          )}
        </label>
      </div>
      <div className="mt-5 rounded-lg bg-slate-50 p-4">
        <p className="text-sm text-slate-500">Wallet debit</p>
        <p className="text-2xl font-bold text-slate-950">NGN {payable.toLocaleString()}</p>
      </div>
      {pricing.length === 0 && (
        <p className="mt-3 text-xs text-slate-500">Default airtime pricing is being used until admin pricing is configured.</p>
      )}
      <button disabled={loading || networkOptions.length === 0 || !selected?.isActive || !amountInput || amount <= 0 || hasNetworkMismatch} className="mt-5 rounded-lg bg-brand-600 px-5 py-3 font-semibold text-white disabled:opacity-60">
        {loading ? "Processing..." : "Confirm purchase"}
      </button>
      </form>
      <PurchaseSuccessModal
        open={Boolean(success)}
        amount={success?.amount || 0}
        serviceType={success?.serviceType || "Airtime purchase successful"}
        reference={success?.reference || ""}
        receiptUrl={success?.reference ? `/dashboard/receipts/${success.reference}` : undefined}
        onClose={() => setSuccess(null)}
      />
    </>
  );
}
