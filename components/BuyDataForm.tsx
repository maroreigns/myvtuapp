"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { readApiResponse } from "@/lib/client-response";
import { detectNetwork, normalizeNigerianPhone } from "@/lib/network-detection";
import { NETWORKS, networkLabel } from "@/lib/networks";
import { PurchaseSuccessModal } from "@/components/PurchaseSuccessModal";

type Plan = { id: string; network: string; name: string; dataSize: string; validity: string; sellingPrice: number };
type PlansResponse = {
  success?: boolean;
  plans?: Plan[];
  source?: "provider" | "cache";
  provider?: string;
  message?: string | null;
  error?: string | null;
};
type CachedPlans = { plans: Plan[] };
type SuccessState = { amount: number; serviceType: string; reference: string } | null;

const phoneRegex = /^(070|080|081|090|091|071)\d{8}$/;
const PLAN_LOAD_TIMEOUT_MS = 8_000;

export function BuyDataForm() {
  const router = useRouter();
  const [network, setNetwork] = useState("MTN");
  const [currentPlans, setCurrentPlans] = useState<Plan[]>([]);
  const [planId, setPlanId] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [plansLoading, setPlansLoading] = useState(false);
  const [success, setSuccess] = useState<SuccessState>(null);
  const plansCache = useRef<Record<string, CachedPlans>>({});
  const requestId = useRef(0);
  const visiblePlans = useMemo(() => currentPlans.filter((plan) => plan.network === network), [currentPlans, network]);
  const selected = useMemo(() => visiblePlans.find((plan) => plan.id === planId), [visiblePlans, planId]);
  const hasPlanNetworkMismatch = Boolean(selected && selected.network !== network);
  const normalizedPhone = normalizeNigerianPhone(phoneNumber);
  const phoneValid = phoneRegex.test(normalizedPhone);
  const detectedNetwork = detectNetwork(phoneNumber);
  const hasNetworkMismatch = Boolean(detectedNetwork && detectedNetwork !== network);

  const planNetworkMatches = useCallback((plan: Plan, selectedNetwork: string) => plan.network === selectedNetwork, []);

  function planLabel(plan: Plan) {
    const nameIncludesSize = plan.name.toLowerCase().includes(plan.dataSize.toLowerCase());
    return nameIncludesSize
      ? `${plan.name} - ${plan.validity} - NGN ${plan.sellingPrice.toLocaleString()}`
      : `${plan.name} ${plan.dataSize} - ${plan.validity} - NGN ${plan.sellingPrice.toLocaleString()}`;
  }

  const logPlanDebug = useCallback((selectedNetwork: string, plans: Plan[]) => {
    console.info("[buy-data] plans loaded", {
      selectedNetwork,
      planCount: plans.length,
      firstPlans: plans.slice(0, 3).map(planLabel)
    });
  }, []);

  const applyPlans = useCallback((selectedNetwork: string, plans: Plan[]) => {
    const filteredPlans = plans.filter((plan) => planNetworkMatches(plan, selectedNetwork));
    setCurrentPlans(filteredPlans);
    setPlanId((currentPlanId) => {
      if (filteredPlans.some((plan) => plan.id === currentPlanId)) return currentPlanId;
      return filteredPlans[0]?.id || "";
    });
  }, [planNetworkMatches]);

  function updatePhoneNumber(value: string) {
    setPhoneNumber(value);
    const detected = detectNetwork(value);
    if (detected && !phoneNumber.trim()) setNetwork(detected);
  }

  const loadPlans = useCallback(async (selectedNetwork: string) => {
    const cached = plansCache.current[selectedNetwork];
    setPlanId("");
    setCurrentPlans([]);
    if (cached) applyPlans(selectedNetwork, cached.plans);

    const controller = new AbortController();
    const currentRequest = requestId.current + 1;
    requestId.current = currentRequest;
    const timeout = setTimeout(() => controller.abort(), PLAN_LOAD_TIMEOUT_MS);

    setPlansLoading(!cached);

    try {
      const response = await fetch(`/api/data/plans?network=${encodeURIComponent(selectedNetwork)}`, {
        cache: "no-store",
        signal: controller.signal
      });
      const { data } = await readApiResponse<PlansResponse>(response);

      if (!response.ok || data.success === false) return;

      const nextPlans = (data.plans || []).filter((plan) => planNetworkMatches(plan, selectedNetwork));
      if (nextPlans.length === 0) return;
      plansCache.current[selectedNetwork] = { plans: nextPlans };

      if (requestId.current !== currentRequest) return;
      logPlanDebug(selectedNetwork, nextPlans);
      applyPlans(selectedNetwork, nextPlans);
    } catch {
      if (!cached && requestId.current === currentRequest) {
        applyPlans(selectedNetwork, []);
      }
    } finally {
      clearTimeout(timeout);
      if (requestId.current === currentRequest) {
        setPlansLoading(false);
      }
    }
  }, [applyPlans, logPlanDebug, planNetworkMatches]);

  const prefetchPlans = useCallback(async (selectedNetwork: string) => {
    if (plansCache.current[selectedNetwork]) return;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), PLAN_LOAD_TIMEOUT_MS);
    try {
      const response = await fetch(`/api/data/plans?network=${encodeURIComponent(selectedNetwork)}`, {
        cache: "no-store",
        signal: controller.signal
      });
      const { data } = await readApiResponse<PlansResponse>(response);
      if (!response.ok || data.success === false) return;

      const nextPlans = (data.plans || []).filter((plan) => planNetworkMatches(plan, selectedNetwork));
      if (nextPlans.length === 0) return;
      plansCache.current[selectedNetwork] = { plans: nextPlans };
      logPlanDebug(selectedNetwork, nextPlans);
    } catch {
      // Silent prefetch; selected-network load handles the visible state.
    } finally {
      clearTimeout(timeout);
    }
  }, [logPlanDebug, planNetworkMatches]);

  useEffect(() => {
    loadPlans(network);
  }, [loadPlans, network]);

  useEffect(() => {
    NETWORKS.filter((item) => item.value !== network).forEach((item) => {
      prefetchPlans(item.value);
    });
  }, [network, prefetchPlans]);

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
        body: JSON.stringify({ planId, network, phoneNumber: normalizedPhone })
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
        toast.error(data.error || error || "Purchase failed");
        return;
      }
      if (data.transaction?.status === "FAILED") {
        toast.error("Provider failed. Wallet refunded automatically.");
      } else {
        setSuccess({
          amount: data.amount ?? data.transaction?.amount ?? selected.sellingPrice,
          serviceType: data.message || "Data purchase successful",
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
      <div className="grid gap-4 md:grid-cols-2">
        <label className="text-sm font-medium text-slate-700">
          Network
          <select
            value={network}
            onChange={(event) => setNetwork(event.target.value)}
            disabled={loading}
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
            disabled={plansLoading || loading || visiblePlans.length === 0}
            className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 disabled:bg-slate-100"
          >
            {plansLoading && <option value="">Loading data plans...</option>}
            {!plansLoading && visiblePlans.length === 0 && <option value="">No data plans available</option>}
            {!plansLoading && visiblePlans.map((plan) => {
              const label = planLabel(plan);
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
      {!plansLoading && visiblePlans.length === 0 && (
        <p className="mt-4 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
          No data plans available for {networkLabel(network)} right now.
        </p>
      )}
      {plansLoading && (
        <div className="mt-4 flex items-center gap-2 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-brand-600" />
          Loading data plans...
        </div>
      )}
      <div className="mt-5 rounded-lg bg-slate-50 p-4">
        <p className="text-sm text-slate-500">Price</p>
        <p className="text-2xl font-bold text-slate-950">NGN {!hasPlanNetworkMismatch && selected ? selected.sellingPrice.toLocaleString() : 0}</p>
      </div>
      <button disabled={loading || plansLoading || !network || !planId || !phoneValid || hasNetworkMismatch || hasPlanNetworkMismatch} className="mt-5 rounded-lg bg-brand-600 px-5 py-3 font-semibold text-white disabled:opacity-60">
        {loading ? "Processing..." : "Confirm purchase"}
      </button>
      </form>
      <PurchaseSuccessModal
        open={Boolean(success)}
        amount={success?.amount || 0}
        serviceType={success?.serviceType || "Data purchase successful"}
        reference={success?.reference || ""}
        receiptUrl={success?.reference ? `/dashboard/receipts/${success.reference}` : undefined}
        onClose={() => setSuccess(null)}
      />
    </>
  );
}
