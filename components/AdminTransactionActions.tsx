"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function AdminTransactionActions({ id }: { id: string }) {
  const router = useRouter();
  async function run(action: string) {
    const response = await fetch(`/api/admin/transactions/${id}?action=${action}`, { method: "POST" });
    const data = await response.json();
    response.ok ? toast.success(`Transaction ${action} completed`) : toast.error(data.error);
    router.refresh();
  }
  return (
    <div className="flex gap-2">
      <button onClick={() => run("retry")} className="rounded-lg border border-slate-300 px-3 py-1 text-xs">Retry</button>
      <button onClick={() => run("refund")} className="rounded-lg bg-brand-600 px-3 py-1 text-xs font-semibold text-white">Refund</button>
    </div>
  );
}
