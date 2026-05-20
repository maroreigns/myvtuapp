import { Suspense } from "react";
import { WalletSuccessClient } from "@/components/WalletSuccessClient";

export default function WalletSuccessPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-lg rounded-lg border border-slate-200 bg-white p-6 text-center shadow-sm">Verifying payment...</div>}>
      <WalletSuccessClient />
    </Suspense>
  );
}
