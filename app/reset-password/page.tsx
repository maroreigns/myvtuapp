"use client";

import { useState } from "react";
import { toast } from "sonner";

export default function ResetPasswordPage() {
  const [loading, setLoading] = useState(false);
  async function submit(formData: FormData) {
    setLoading(true);
    const response = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: String(formData.get("token")), password: String(formData.get("password")) })
    });
    const data = await response.json();
    setLoading(false);
    response.ok ? toast.success(data.message) : toast.error(data.error);
  }

  return (
    <main className="grid min-h-screen place-items-center px-4">
      <form action={submit} className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-soft">
        <h1 className="text-xl font-bold">Reset password</h1>
        <input name="token" placeholder="Reset token" required className="mt-5 w-full rounded-lg border border-slate-300 px-3 py-2" />
        <input name="password" type="password" placeholder="New password" required className="mt-3 w-full rounded-lg border border-slate-300 px-3 py-2" />
        <button disabled={loading} className="mt-5 w-full rounded-lg bg-brand-600 px-4 py-3 font-semibold text-white">
          {loading ? "Updating..." : "Update password"}
        </button>
      </form>
    </main>
  );
}
