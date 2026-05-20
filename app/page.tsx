import Link from "next/link";
import { ArrowRight, BadgeCheck, Cable, CreditCard, Database, Lightbulb, MessageSquareText, Phone, ShieldCheck, Ticket, Wallet } from "lucide-react";
import { Logo } from "@/components/Logo";

const services = [
  ["Data", Database],
  ["Airtime", Phone],
  ["Electricity", Lightbulb],
  ["Cable TV", Cable],
  ["Betting Funding", Wallet],
  ["Exam Pins", Ticket],
  ["Bulk SMS", MessageSquareText]
];

export default function HomePage() {
  return (
    <main className="bg-white">
      <header className="mx-auto flex max-w-7xl items-center justify-between px-4 py-5 sm:px-6 lg:px-8">
        <Logo />
        <nav className="flex items-center gap-3">
          <Link href="/login" className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100">
            Login
          </Link>
          <Link href="/register" className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700">
            Get started
          </Link>
        </nav>
      </header>

      <section className="fintech-grid border-y border-slate-100 bg-slate-50">
        <div className="mx-auto grid min-h-[620px] max-w-7xl items-center gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:px-8">
          <div>
            <p className="mb-4 inline-flex rounded-lg bg-brand-50 px-3 py-1 text-sm font-semibold text-brand-700">Nigeria VTU and wallet infrastructure</p>
            <h1 className="max-w-3xl text-4xl font-bold leading-tight tracking-normal text-slate-950 sm:text-5xl lg:text-6xl">
              Sell data, airtime, bills and digital pins from one secure wallet.
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
              NaijaDataHub gives customers and resellers a clean way to fund wallets, buy mobile data, track every transaction, and scale into more digital services.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/register" className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-5 py-3 font-semibold text-white hover:bg-brand-700">
                Start buying <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/login" className="rounded-lg border border-slate-300 px-5 py-3 font-semibold text-slate-700 hover:bg-white">
                Open dashboard
              </Link>
            </div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
            <div className="rounded-lg bg-slate-950 p-5 text-white">
              <p className="text-sm text-slate-300">Wallet balance</p>
              <p className="mt-3 text-4xl font-bold">₦125,400</p>
              <div className="mt-8 grid grid-cols-2 gap-3">
                {["MTN 5GB", "Airtel 2GB", "Glo 1GB", "9mobile 5GB"].map((item) => (
                  <div key={item} className="rounded-lg bg-white/10 p-4">
                    <p className="text-sm">{item}</p>
                    <p className="mt-2 font-semibold text-brand-100">Instant delivery</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {services.map(([label, Icon]) => (
            <div key={label as string} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <Icon className="h-6 w-6 text-ocean-600" />
              <p className="mt-4 font-semibold">{label as string}</p>
              <p className="mt-2 text-sm leading-6 text-slate-500">Ready for customer and reseller workflows.</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-slate-950 py-16 text-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 sm:px-6 lg:grid-cols-3 lg:px-8">
          {["Transaction-safe wallet ledger", "Provider-ready service adapters", "Admin controls for growth"].map((title) => (
            <div key={title}>
              <BadgeCheck className="h-7 w-7 text-brand-500" />
              <h2 className="mt-4 text-xl font-bold">{title}</h2>
              <p className="mt-3 leading-7 text-slate-300">Built with clear records, server-side secrets, validation, and extensible service modules.</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-2">
          <div>
            <h2 className="text-3xl font-bold">How it works</h2>
            <div className="mt-6 space-y-4">
              {["Create an account", "Fund wallet with Paystack mock flow", "Buy data and receive transaction proof"].map((step, index) => (
                <div key={step} className="flex gap-4 rounded-lg border border-slate-200 p-4">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand-600 font-bold text-white">{index + 1}</span>
                  <p className="font-medium">{step}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-lg bg-brand-50 p-6">
            <ShieldCheck className="h-8 w-8 text-brand-700" />
            <p className="mt-4 text-xl font-semibold text-slate-950">“The wallet ledger and admin pricing controls make this practical for daily operations.”</p>
            <p className="mt-4 text-sm text-slate-600">Demo reseller feedback</p>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-200 px-4 py-8 text-center text-sm text-slate-500">
        © 2026 NaijaDataHub. Built for secure Nigerian digital service resale.
      </footer>
    </main>
  );
}
