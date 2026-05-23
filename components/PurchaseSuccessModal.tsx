"use client";

import Link from "next/link";
import { Check } from "lucide-react";

type PurchaseSuccessModalProps = {
  open: boolean;
  amount: number;
  serviceType: string;
  reference: string;
  onClose: () => void;
  receiptUrl?: string;
};

export function PurchaseSuccessModal({
  open,
  amount,
  serviceType,
  reference,
  onClose,
  receiptUrl
}: PurchaseSuccessModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4 py-6 animate-[modalFadeIn_180ms_ease-out]">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-2xl animate-[modalPopIn_260ms_cubic-bezier(0.16,1,0.3,1)]">
        <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-emerald-100 animate-[checkPopIn_520ms_cubic-bezier(0.34,1.56,0.64,1)]">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg shadow-emerald-200">
            <Check className="h-9 w-9" strokeWidth={3} />
          </div>
        </div>
        <h2 className="mt-5 text-2xl font-bold text-slate-950">Successful</h2>
        <p className="mt-2 text-sm font-medium text-slate-600">{serviceType}</p>
        <p className="mt-4 text-3xl font-bold text-slate-950">NGN {amount.toLocaleString()}</p>
        <div className="mt-5 rounded-lg bg-slate-50 px-4 py-3 text-left">
          <p className="text-xs font-semibold uppercase text-slate-500">Transaction reference</p>
          <p className="mt-1 break-all font-mono text-sm text-slate-900">{reference}</p>
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {receiptUrl ? (
            <Link
              href={receiptUrl}
              className="inline-flex items-center justify-center rounded-lg border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700"
            >
              View receipt
            </Link>
          ) : null}
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center justify-center rounded-lg bg-brand-600 px-4 py-3 text-sm font-semibold text-white shadow-sm"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
