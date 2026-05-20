"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { readApiResponse } from "@/lib/client-response";

export function AdminUserStatusButton({ userId, isActive }: { userId: string; isActive: boolean }) {
  const router = useRouter();

  async function submit() {
    if (!confirm(`${isActive ? "Deactivate" : "Activate"} this user?`)) return;
    const response = await fetch("/api/admin/users/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, isActive: !isActive })
    });
    const { data, error } = await readApiResponse<{ error?: string }>(response);
    response.ok ? toast.success("User status updated") : toast.error(data.error || error || "Could not update user");
    router.refresh();
  }

  return (
    <button onClick={submit} className="rounded-lg border border-slate-300 px-3 py-2 text-xs">
      {isActive ? "Deactivate" : "Activate"}
    </button>
  );
}
