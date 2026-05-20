"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { readApiResponse } from "@/lib/client-response";

export function WalletSuccessClient() {
  const searchParams = useSearchParams();
  const [message, setMessage] = useState("Verifying payment...");
  const [ok, setOk] = useState(false);

  useEffect(() => {
    const reference = searchParams.get("reference");
    if (!reference) {
      setMessage("Payment reference is missing.");
      return;
    }

    fetch("/api/wallet/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reference })
    })
      .then(async (response) => {
        const { data, error } = await readApiResponse<{ error?: string }>(response);
        setOk(response.ok);
        setMessage(response.ok ? "Wallet funded successfully." : data.error || error || "Payment verification failed.");
      })
      .catch(() => setMessage("Payment verification failed."));
  }, [searchParams]);

  return (
    <div className="mx-auto max-w-lg rounded-lg border border-slate-200 bg-white p-6 text-center shadow-sm">
      <h1 className="text-2xl font-bold">{ok ? "Payment successful" : "Payment verification"}</h1>
      <p className="mt-3 text-sm text-slate-600">{message}</p>
      <Link href="/dashboard/wallet" className="mt-5 inline-flex rounded-lg bg-brand-600 px-5 py-2 font-semibold text-white">Back to wallet</Link>
    </div>
  );
}
