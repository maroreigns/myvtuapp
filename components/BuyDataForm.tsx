"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { readApiResponse } from "@/lib/client-response";
import { detectNetwork, normalizeNigerianPhone } from "@/lib/network-detection";
import { NETWORKS, networkLabel } from "@/lib/networks";

type Plan = { id: string; network: string; name: string; dataSize: string; validity: string; sellingPrice: number };
type PlansResponse = { plans?: Plan[]; source?: string; message?: string | null; error?: string };

const phoneRegex = /^(070|080|081|090|091|071)\d{8}$/;

export function BuyDataForm() {
  const router = useRouter();
  const [network, setNetwork] = useState("MTN");
  const [currentPlans, setCurrentPlans] = useState<Plan[]>([]);
  const [planId, setPlanId] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [plansLoading, setPlansLoading] = useState(false);
  const [notice, setNotice] = useState("");
  const [planError, setPlanError] = useState("");
  const selected = useMemo(() => currentPlans.find((plan) => plan.id === planId), [currentPlans, planId]);
  const normalizedPhone = normalizeNigerianPhone(phoneNumber);
  const phoneValid = phoneRegex.test(normalizedPhone);
  const detectedNetwork = detectNetwork(phoneNumber);
  const hasNetworkMismatch = Boolean(detectedNetwork && detectedNetwork !== network);

  function updatePhoneNumber(value: string) {
    setPhoneNumber(value);
    const detected = detectNetwork(value);
    if (detected && !phoneNumber.trim()) setNetwork(detected);
  }

  useEffect(() => {
    let cancelled = false;

    async function loadPlans() {
      setPlansLoading(true);
      setPlanError("");

      try {
        const response = await fetch(`/api/data/plans?network=${encodeURIComponent(network)}`, { cache: "no-store" });
        const { data, error } = await readApiResponse<PlansResponse>(response);

        if (!response.ok) {
          throw new Error(data.error || error || "Could not load data plans");
        }

        const nextPlans = data.plans || [];
        if (cancelled) return;

        setCurrentPlans(nextPlans);
        setPlanId(nextPlans[0]?.id || "");
        setNotice(data.message || "");
      } catch (error) {
        if (cancelled) return;
        setCurrentPlans([]);
        setPlanId("");
        setPlanError(error instanceof Error ? error.message : "Could not load data plans");
        setNotice("");
      } finally {
        if (!cancelled) setPlansLoading(false);
      }
    }

    loadPlans();
    return () => {
      cancelled = true;
    };
  }, [network]);

  async function submit(formData: FormData) {
    if (!network) {
      toast.error("Please select a network");
      return;
    }
    if (!selected) {
      toast.error("Please select a data plan");
      return;
    }
    if (!phoneValid) {
      toast.error("Enter a valid Nigerian phone number");
      return;
    }
    if (hasNetworkMismatch) {
      toast.error("This phone number does not match selected network.");
      return;
    }
    if (!confirm(`Buy ${selected.name} for NGN ${selected.sellingPrice.toLocaleString()}?`)) return;
    setLoading(true);
    try {
      const response = await fetch("/api/data/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId, phoneNumber: normalizedPhone })
      });
      const { data, error } = await readApiResponse<{ error?: string; transaction?: { status?: string } }>(response);
      if (!response.ok) {
        toast.error(data.error || error || "Purchase failed");
        return;
      }
      if (data.transaction?.status === "FAILED") {
        toast.error("Provider failed. Wallet refunded automatically.");
      } else {
        toast.success("Data purchase successful");
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
      <div className="grid gap-4 md:grid-cols-2">
        <label className="text-sm font-medium text-slate-700">
          Network
          <select
            value={network}
            onChange={(event) => setNetwork(event.target.value)}
            disabled={plansLoading || loading}
            className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 disabled:bg-slate-100"
          >
            {NETWORKS.map((item) => (
              <option key={item.value} value={item.value}>{item.label}</option>
            ))}
          </select>
        </label>
        <label className="text-sm font-medium text-slate-700">
          Data plan
          <select
            value={planId}
            onChange={(event) => setPlanId(event.target.value)}
            disabled={plansLoading || loading || currentPlans.length === 0}
            className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 disabled:bg-slate-100"
          >
            {plansLoading && <option value="">Loading data plans...</option>}
            {!plansLoading && currentPlans.length === 0 && <option value="">No data plans available</option>}
            {!plansLoading && currentPlans.map((plan) => {
              const nameIncludesSize = plan.name.toLowerCase().includes(plan.dataSize.toLowerCase());
              const label = nameIncludesSize
                ? `${plan.name} - ${plan.validity} - NGN ${plan.sellingPrice.toLocaleString()}`
                : `${plan.name} ${plan.dataSize} - ${plan.validity} - NGN ${plan.sellingPrice.toLocaleString()}`;
              return (
              <option key={plan.id} value={plan.id}>
                {label}
              </option>
              );
            })}
          </select>
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
      {notice && <p className="mt-4 rounded-lg bg-sky-50 p-3 text-sm text-sky-700">{notice}</p>}
      {planError && <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{planError}</p>}
      {!plansLoading && currentPlans.length === 0 && (
        <p className="mt-4 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">No data plans available for this network.</p>
      )}
      {plansLoading && (
        <div className="mt-4 flex items-center gap-2 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-brand-600" />
          Loading data plans...
        </div>
      )}
      <div className="mt-5 rounded-lg bg-slate-50 p-4">
        <p className="text-sm text-slate-500">Price</p>
        <p className="text-2xl font-bold text-slate-950">NGN {selected?.sellingPrice.toLocaleString() || 0}</p>
      </div>
      <button disabled={loading || plansLoading || !network || !planId || !phoneValid || hasNetworkMismatch} className="mt-5 rounded-lg bg-brand-600 px-5 py-3 font-semibold text-white disabled:opacity-60">
        {loading ? "Processing..." : "Confirm purchase"}
      </button>
    </form>
  );
}
