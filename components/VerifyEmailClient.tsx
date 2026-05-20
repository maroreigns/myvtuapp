"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { readApiResponse } from "@/lib/client-response";

export function VerifyEmailClient() {
  const searchParams = useSearchParams();
  const [message, setMessage] = useState("Verifying your email...");
  const [ok, setOk] = useState(false);

  useEffect(() => {
    const token = searchParams.get("token");
    if (!token) {
      setMessage("Verification token is missing.");
      return;
    }

    fetch("/api/auth/verify-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token })
    })
      .then(async (response) => {
        const { data, error } = await readApiResponse<{ message?: string; error?: string }>(response);
        setOk(response.ok);
        setMessage(response.ok ? data.message || "Email verified successfully" : data.error || error || "Verification failed");
      })
      .catch(() => setMessage("Verification failed. Please request a new link."));
  }, [searchParams]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <section className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 text-center shadow-sm">
        <h1 className="text-2xl font-bold text-slate-950">{ok ? "Email verified" : "Verify email"}</h1>
        <p className="mt-3 text-sm text-slate-600">{message}</p>
        <Link href="/dashboard" className="mt-5 inline-flex rounded-lg bg-brand-600 px-5 py-2 font-semibold text-white">
          Continue
        </Link>
      </section>
    </main>
  );
}
