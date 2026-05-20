const names: Record<string, string> = {
  "electricity-bills": "Electricity bills",
  "cable-tv": "Cable TV",
  "betting-wallet-funding": "Betting wallet funding",
  "waec-neco-exam-pins": "WAEC/NECO exam pins",
  "bulk-sms": "Bulk SMS",
  "airtime-to-cash": "Airtime-to-cash",
  "recharge-card-printing": "Recharge card printing"
};

export default function ComingSoonServicePage({ params }: { params: { slug: string } }) {
  const name = names[params.slug] || "Service";

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">{name}</h1>
        <p className="mt-1 text-sm text-slate-500">This service is being prepared for launch.</p>
      </div>
      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">Coming Soon</span>
        <h2 className="mt-4 text-xl font-bold text-slate-950">{name} is not yet available</h2>
        <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">
          The dashboard already reserves space for this service, but transaction processing is disabled until provider onboarding, pricing, and operational checks are complete.
        </p>
        <button disabled className="mt-5 rounded-lg bg-slate-200 px-5 py-3 font-semibold text-slate-500">
          Processing disabled
        </button>
      </section>
    </div>
  );
}
