"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { readApiResponse } from "@/lib/client-response";

export function AdminPaymentRetryButton({ paymentId }: { paymentId: string }) {
  const router = useRouter();

  async function retry() {
    if (!confirm("Retry Paystack verification for this pending payment?")) return;
    const response = await fetch(`/api/admin/wallet-funding/${paymentId}`, { method: "POST" });
    const { data, error } = await readApiResponse<{ error?: string }>(response);
    response.ok ? toast.success("Payment verification retried") : toast.error(data.error || error || "Verification failed");
    router.refresh();
  }

  return (
    <button type="button" onClick={retry} className="rounded-lg border border-slate-300 px-3 py-1 text-xs font-semibold">
      Retry verification
    </button>
  );
}
