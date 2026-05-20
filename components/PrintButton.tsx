"use client";

export function PrintButton() {
  return (
    <button onClick={() => window.print()} className="rounded-lg bg-brand-600 px-5 py-2 font-semibold text-white">
      Print or download receipt
    </button>
  );
}
