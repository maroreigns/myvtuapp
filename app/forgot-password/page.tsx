"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Logo } from "@/components/Logo";
import { readApiResponse } from "@/lib/client-response";

export default function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false);
  async function submit(formData: FormData) {
    setLoading(true);
    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: String(formData.get("email")) })
      });
      const { data, error } = await readApiResponse<{ message?: string; error?: string }>(response);
      response.ok ? toast.success(data.message || "Check your email") : toast.error(data.error || error || "Could not send reset instructions");
    } catch {
      toast.error("Could not reach the server. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center px-4">
      <form action={submit} className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-soft">
        <div className="mb-6 flex justify-center"><Logo /></div>
        <h1 className="text-xl font-bold">Forgot password</h1>
        <label className="mt-5 block text-sm font-medium text-slate-700">
          Email
          <input name="email" type="email" required className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-brand-600" />
        </label>
        <button disabled={loading} className="mt-5 w-full rounded-lg bg-brand-600 px-4 py-3 font-semibold text-white">
          {loading ? "Sending..." : "Send reset instructions"}
        </button>
      </form>
    </main>
  );
}
