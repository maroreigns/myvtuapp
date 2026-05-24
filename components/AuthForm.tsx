"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { readApiResponse } from "@/lib/client-response";

export function AuthForm({ mode, referralCode = "" }: { mode: "login" | "register"; referralCode?: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function submit(formData: FormData) {
    setLoading(true);
    const payload =
      mode === "register"
        ? {
            fullName: String(formData.get("fullName")),
            email: String(formData.get("email")),
            phone: String(formData.get("phone")),
            password: String(formData.get("password")),
            referralCode: String(formData.get("referralCode") || "")
          }
        : { email: String(formData.get("email")), password: String(formData.get("password")) };

    try {
      const response = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const { data, error } = await readApiResponse<{
        success?: boolean;
        message?: string;
        error?: string;
        signedIn?: boolean;
        user?: { role?: string };
      }>(response);

      if (!response.ok) {
        toast.error(data.message || data.error || error || "Authentication failed. Please check your details.");
        return;
      }

      toast.success(data.message || (mode === "login" ? "Welcome back" : "Account created. Please verify your email."));
      if (mode === "register" && !data.signedIn) {
        router.push("/login");
      } else {
        router.push(data.user?.role === "ADMIN" ? "/admin" : "/dashboard");
      }
      router.refresh();
    } catch {
      toast.error("Could not reach the server. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form action={submit} className="space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow-soft">
      {mode === "register" && (
        <>
          <label className="block text-sm font-medium text-slate-700">
            Full name
            <input name="fullName" required className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-brand-600" />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Phone number
            <input name="phone" required placeholder="08012345678" className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-brand-600" />
          </label>
          <input name="referralCode" type="hidden" defaultValue={referralCode} />
        </>
      )}
      <label className="block text-sm font-medium text-slate-700">
        Email
        <input name="email" type="email" required className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-brand-600" />
      </label>
      <label className="block text-sm font-medium text-slate-700">
        Password
        <input name="password" type="password" required className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-brand-600" />
      </label>
      <button disabled={loading} className="w-full rounded-lg bg-brand-600 px-4 py-3 font-semibold text-white hover:bg-brand-700 disabled:opacity-60">
        {loading ? "Processing..." : mode === "login" ? "Login" : "Create account"}
      </button>
      <div className="flex justify-between text-sm text-slate-600">
        <Link href={mode === "login" ? "/register" : "/login"} className="text-brand-700">
          {mode === "login" ? "Create account" : "Login instead"}
        </Link>
        <Link href="/forgot-password" className="text-brand-700">
          Forgot password?
        </Link>
      </div>
    </form>
  );
}
