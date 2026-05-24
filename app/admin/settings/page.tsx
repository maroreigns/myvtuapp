import { Settings } from "lucide-react";

function providerMode() {
  return "vtpass";
}

export default function AdminSettingsPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="mt-1 text-sm text-slate-500">Operational settings overview. Secret keys are intentionally hidden.</p>
      </div>
      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <Settings className="h-5 w-5 text-brand-600" />
            <h2 className="font-bold">Pricing and profit margin</h2>
          </div>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Admin pricing and profit margin controls can be connected here. Existing pricing tools remain available in the Pricing section.
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-bold">Provider mode</h2>
          <p className="mt-3 rounded-lg bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700">{providerMode()}</p>
          <p className="mt-3 text-sm leading-6 text-slate-600">VTpass is the only active VTU provider. Fallback providers are disabled, and API keys are never displayed in the admin UI.</p>
        </div>
      </section>
    </div>
  );
}
