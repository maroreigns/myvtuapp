import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowRight, Cable, Database, Facebook, Instagram, Lightbulb, MessageSquareText, Music2, Phone, RefreshCcw, ShieldCheck, Ticket, Twitter, Wallet } from "lucide-react";
import { BrandWordmark, Logo } from "@/components/Logo";

const serviceCards: Array<{
  title: string;
  description: string;
  button: string;
  icon: LucideIcon;
  href?: string;
}> = [
  {
    title: "Airtime",
    description: "Buy affordable airtime instantly for MTN, Airtel, Glo and 9mobile.",
    button: "Buy Airtime",
    icon: Phone,
    href: "/dashboard/buy-airtime"
  },
  {
    title: "Data",
    description: "Buy and resell cheap data bundles for all Nigerian networks from one secure wallet.",
    button: "Buy Data",
    icon: Database,
    href: "/dashboard/buy-data"
  },
  {
    title: "Cable TV",
    description: "Subscribe to DStv, GOtv and StarTimes quickly with instant activation.",
    button: "Coming Soon",
    icon: Cable
  },
  {
    title: "Electricity",
    description: "Pay prepaid and postpaid electricity bills from your secure wallet.",
    button: "Coming Soon",
    icon: Lightbulb
  },
  {
    title: "Betting Funding",
    description: "Fund betting wallets easily and securely when this service becomes available.",
    button: "Coming Soon",
    icon: Wallet
  },
  {
    title: "Exam Pins",
    description: "Buy WAEC, NECO and other digital exam pins directly from your wallet.",
    button: "Coming Soon",
    icon: Ticket
  },
  {
    title: "Bulk SMS",
    description: "Send promotional and transactional SMS to customers at affordable rates.",
    button: "Coming Soon",
    icon: MessageSquareText
  },
  {
    title: "Airtime to Cash",
    description: "Convert excess airtime to wallet balance when this service becomes available.",
    button: "Coming Soon",
    icon: RefreshCcw
  }
];

const providers = [
  { name: "MTN", mark: "MTN", tone: "bg-yellow-100 text-yellow-900 ring-yellow-200" },
  { name: "Airtel", mark: "AIR", tone: "bg-red-100 text-red-700 ring-red-200" },
  { name: "Glo", mark: "GLO", tone: "bg-emerald-100 text-emerald-800 ring-emerald-200" },
  { name: "9mobile", mark: "9MO", tone: "bg-lime-100 text-lime-800 ring-lime-200" },
  { name: "DStv", mark: "DST", tone: "bg-sky-100 text-sky-800 ring-sky-200" },
  { name: "GOtv", mark: "GOT", tone: "bg-blue-100 text-blue-800 ring-blue-200" },
  { name: "Startimes", mark: "STA", tone: "bg-indigo-100 text-indigo-800 ring-indigo-200" },
  { name: "Electricity", mark: "PWR", tone: "bg-amber-100 text-amber-800 ring-amber-200" },
  { name: "WAEC/Exam pins", mark: "PIN", tone: "bg-violet-100 text-violet-800 ring-violet-200" }
];

const resources = ["Airtime", "Data", "Cable TV", "Electricity", "Exam Pins", "Track Order", "Pricing", "About", "Blog", "Support Desk"];
const socials = [
  { label: "Facebook", icon: Facebook },
  { label: "X/Twitter", icon: Twitter },
  { label: "Instagram", icon: Instagram },
  { label: "TikTok", icon: Music2 }
];

export default function HomePage() {
  return (
    <main className="bg-white">
      <header className="mx-auto flex max-w-7xl items-center justify-between px-4 py-5 sm:px-6 lg:px-8">
        <Logo />
        <nav className="flex items-center gap-3">
          <Link href="/login" className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100">
            Login
          </Link>
          <Link href="/register" className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700">
            Get started
          </Link>
        </nav>
      </header>

      <section className="fintech-grid border-y border-slate-100 bg-slate-50">
        <div className="mx-auto grid min-h-[640px] max-w-7xl items-center gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:px-8">
          <div>
            <p className="mb-4 inline-flex rounded-lg bg-brand-50 px-3 py-1 text-sm font-semibold text-brand-700">Nigeria VTU and wallet infrastructure</p>
            <h1 className="max-w-3xl text-4xl font-bold leading-tight tracking-normal text-slate-950 sm:text-5xl lg:text-6xl">
              Sell/Buy data, airtime, bills and digital pins from one secure wallet.
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
              <BrandWordmark /> gives customers and resellers a dependable way to fund wallets, buy mobile data, track every transaction, and scale into more digital services.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/register" className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-5 py-3 font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-brand-700 hover:shadow-md">
                Start buying <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/login" className="rounded-lg border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-brand-200 hover:text-brand-700 hover:shadow-md">
                Open dashboard
              </Link>
            </div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
            <div className="rounded-lg bg-slate-950 p-5 text-white">
              <p className="text-sm text-slate-300">Wallet balance</p>
              <p className="mt-3 text-4xl font-bold">NGN 10,000</p>
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

      <section className="bg-white px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-wide text-brand-700">Services</p>
            <h2 className="mt-2 text-3xl font-bold text-slate-950 sm:text-4xl">Everything your digital service business needs</h2>
            <p className="mt-4 text-base leading-7 text-slate-600">Buy, resell, and manage essential Nigerian digital services with clean wallet-based workflows.</p>
          </div>
          <div className="mt-10 grid gap-6 lg:grid-cols-3">
            {serviceCards.map((service) => {
              const Icon = service.icon;
              return (
                <article
                  key={service.title}
                  className="group flex min-h-[330px] flex-col rounded-lg border border-slate-200 bg-white p-8 shadow-sm transition duration-200 hover:-translate-y-2 hover:border-brand-100 hover:shadow-soft"
                >
                  <div className="mx-auto mb-4 flex items-center justify-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-sky-50 text-ocean-600 ring-1 ring-sky-100 transition group-hover:bg-brand-50 group-hover:text-brand-700">
                      <Icon className="h-9 w-9" />
                    </div>
                  </div>
                  <h3 className="mb-4 text-center text-2xl font-bold text-slate-950">{service.title}</h3>
                  <p className="mb-8 flex-1 text-center text-base leading-7 text-slate-600">{service.description}</p>
                  {service.href ? (
                    <Link
                      href={service.href}
                      className="mt-auto inline-flex h-12 items-center justify-center rounded-lg border border-ocean-600 px-6 text-sm font-bold text-ocean-700 transition duration-200 hover:border-brand-600 hover:bg-brand-600 hover:text-white"
                    >
                      {service.button}
                    </Link>
                  ) : (
                    <button
                      type="button"
                      disabled
                      className="mt-auto inline-flex h-12 cursor-not-allowed items-center justify-center rounded-lg border border-slate-300 px-6 text-sm font-bold text-slate-400"
                    >
                      {service.button}
                    </button>
                  )}
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl rounded-lg bg-sky-50 px-4 py-8 shadow-sm ring-1 ring-sky-100 sm:px-6 lg:px-8">
          <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-brand-700">Supported services</p>
              <h2 className="mt-2 text-2xl font-bold text-slate-950 sm:text-3xl">Pay for everyday digital services</h2>
            </div>
            <p className="max-w-xl text-sm leading-6 text-slate-600">Fast access to mobile networks, cable subscriptions, power bills, and exam pins from one wallet.</p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-9">
            {providers.map((provider) => (
              <div
                key={provider.name}
                className="flex min-h-28 flex-col items-center justify-center rounded-lg bg-white p-3 text-center shadow-sm ring-1 ring-slate-100 transition duration-200 hover:-translate-y-1 hover:shadow-soft"
              >
                <span className={`grid h-14 w-14 place-items-center rounded-full text-sm font-black ring-1 ${provider.tone}`}>{provider.mark}</span>
                <span className="mt-3 text-sm font-semibold text-slate-800">{provider.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-2">
          <div>
            <h2 className="text-3xl font-bold">How it works</h2>
            <div className="mt-6 space-y-4">
              {["Create an account", "Fund wallet", "Buy data and receive transaction proof"].map((step, index) => (
                <div key={step} className="flex gap-4 rounded-lg border border-slate-200 p-4">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand-600 font-bold text-white">{index + 1}</span>
                  <p className="font-medium">{step}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-lg bg-brand-50 p-6">
            <ShieldCheck className="h-8 w-8 text-brand-700" />
            <p className="mt-4 text-xl font-semibold text-slate-950">Trusted by users and resellers for fast airtime, data, bill payments, and secure wallet transactions.</p>
            <p className="mt-4 text-sm text-slate-600">Reliable digital services for everyday users and growing resellers.</p>
          </div>
        </div>
      </section>

      <footer className="bg-slate-950 text-slate-300">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-2 lg:grid-cols-4 lg:px-8">
          <div>
            <h2 className="text-base font-bold text-white">Contact Us</h2>
            <div className="mt-4 space-y-3 text-sm leading-6">
              <p><span className="block font-semibold text-slate-200">Address:</span>Lagos, Nigeria</p>
              <p><span className="block font-semibold text-slate-200">Phone (WhatsApp):</span>+234 812 875 5117</p>
              <p><span className="block font-semibold text-slate-200">Email:</span>support@obmapay.com</p>
            </div>
          </div>
          <div>
            <h2 className="text-base font-bold text-white">About Us</h2>
            <p className="mt-4 text-sm leading-7">
              <BrandWordmark className="font-semibold text-slate-100" /> is a virtual top-up and digital services platform built to help users buy and resell affordable data, airtime, bill payments, cable TV subscriptions, and digital pins from one secure wallet.
            </p>
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Resources</h2>
            <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              {resources.map((item) => (
                <Link key={item} href={item === "Track Order" ? "/dashboard/transactions" : "/login"} className="transition hover:text-white">
                  {item}
                </Link>
              ))}
            </div>
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Follow Us</h2>
            <div className="mt-4 flex gap-3">
              {socials.map((social) => {
                const Icon = social.icon;
                return (
                <a
                  key={social.label}
                  href="#"
                  aria-label={social.label}
                  className="grid h-10 w-10 place-items-center rounded-full bg-white/10 text-sm font-bold text-white transition hover:-translate-y-1 hover:bg-brand-600 hover:shadow-lg"
                >
                  <Icon className="h-4 w-4" />
                </a>
                );
              })}
            </div>
          </div>
        </div>
        <div className="border-t border-white/10 px-4 py-5 text-center text-sm text-slate-400">
          &copy; 2026 <BrandWordmark />. Built for secure Nigerian digital service resale.
        </div>
      </footer>
    </main>
  );
}
