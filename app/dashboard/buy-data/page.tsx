import { BuyDataForm } from "@/components/BuyDataForm";

export default async function BuyDataPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Buy Data</h1>
        <p className="mt-1 text-sm text-slate-500">Wallet is checked before purchase. Failed provider calls trigger an automatic refund.</p>
      </div>
      <BuyDataForm />
    </div>
  );
}
