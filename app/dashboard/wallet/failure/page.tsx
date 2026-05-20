import Link from "next/link";

export default function WalletFailurePage() {
  return (
    <div className="mx-auto max-w-lg rounded-lg border border-slate-200 bg-white p-6 text-center shadow-sm">
      <h1 className="text-2xl font-bold">Payment failed</h1>
      <p className="mt-3 text-sm text-slate-600">Your wallet was not credited. You can try again from the wallet page.</p>
      <Link href="/dashboard/wallet" className="mt-5 inline-flex rounded-lg bg-brand-600 px-5 py-2 font-semibold text-white">Back to wallet</Link>
    </div>
  );
}
