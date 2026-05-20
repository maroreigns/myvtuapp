"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function AdminWalletForm({ userId }: { userId: string }) {
  const router = useRouter();
  async function submit(formData: FormData) {
    const response = await fetch("/api/admin/users/wallet", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId,
        type: String(formData.get("type")),
        amount: Number(formData.get("amount")),
        description: String(formData.get("description"))
      })
    });
    const data = await response.json();
    response.ok ? toast.success("Wallet updated") : toast.error(data.error);
    router.refresh();
  }

  return (
    <form action={submit} className="grid gap-2 sm:grid-cols-[110px_110px_1fr_auto]">
      <select name="type" className="rounded-lg border border-slate-300 px-2 py-2 text-xs">
        <option value="CREDIT">Credit</option>
        <option value="DEBIT">Debit</option>
      </select>
      <input name="amount" type="number" min="1" placeholder="Amount" className="rounded-lg border border-slate-300 px-2 py-2 text-xs" />
      <input name="description" placeholder="Reason" className="rounded-lg border border-slate-300 px-2 py-2 text-xs" />
      <button className="rounded-lg bg-slate-950 px-3 py-2 text-xs font-semibold text-white">Apply</button>
    </form>
  );
}
