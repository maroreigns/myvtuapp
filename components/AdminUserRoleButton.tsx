"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { readApiResponse } from "@/lib/client-response";

export function AdminUserRoleButton({ userId, role }: { userId: string; role: "USER" | "ADMIN" }) {
  const router = useRouter();
  const isAdmin = role === "ADMIN";

  async function submit() {
    if (isAdmin) return;
    if (!confirm("Make this user an ADMIN? This gives access to all admin pages and actions.")) return;

    const response = await fetch("/api/admin/users/role", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, role: "ADMIN" })
    });
    const { data, error } = await readApiResponse<{ error?: string }>(response);
    response.ok ? toast.success("User promoted to admin") : toast.error(data.error || error || "Could not update role");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={submit}
      disabled={isAdmin}
      className="rounded-lg border border-slate-300 px-3 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-50"
    >
      {isAdmin ? "Already admin" : "Make admin"}
    </button>
  );
}
