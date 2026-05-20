"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { readApiResponse } from "@/lib/client-response";

export function AdminRechargeCardForm() {
  const router = useRouter();

  async function submit(formData: FormData) {
    const rows = String(formData.get("cards"))
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [pin, serialNumber] = line.split(",").map((value) => value.trim());
        return { pin, serialNumber, status: "UNUSED" };
      });

    const response = await fetch("/api/admin/recharge-cards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: String(formData.get("name")),
        network: String(formData.get("network")),
        denomination: Number(formData.get("denomination")),
        cards: rows
      })
    });
    const { data, error } = await readApiResponse<{ error?: string }>(response);
    response.ok ? toast.success("Recharge card batch created") : toast.error(data.error || error || "Could not create batch");
    router.refresh();
  }

  return (
    <form action={submit} className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="grid gap-3 md:grid-cols-3">
        <input name="name" placeholder="Batch name" className="rounded-lg border border-slate-300 px-3 py-2" />
        <select name="network" className="rounded-lg border border-slate-300 px-3 py-2"><option>MTN</option><option>AIRTEL</option><option>GLO</option><option value="NINE_MOBILE">9mobile</option></select>
        <input name="denomination" type="number" placeholder="Denomination" className="rounded-lg border border-slate-300 px-3 py-2" />
      </div>
      <textarea name="cards" rows={5} placeholder="PIN, SERIAL per line" className="rounded-lg border border-slate-300 px-3 py-2" />
      <button className="w-fit rounded-lg bg-brand-600 px-4 py-2 font-semibold text-white">Create batch</button>
    </form>
  );
}
