"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { CreditCard, Database, LogOut, Menu, ReceiptText, Settings, Shield, Smartphone, Users, WalletCards } from "lucide-react";
import { Logo } from "@/components/Logo";

const adminLinks = [
  { href: "/admin", label: "Dashboard", icon: Shield },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/transactions", label: "Transactions", icon: ReceiptText },
  { href: "/admin/wallet-funding", label: "Wallet funding", icon: WalletCards },
  { href: "/admin/airtime-transactions", label: "Airtime pricing", icon: Smartphone },
  { href: "/admin/pricing", label: "Data plans", icon: Database },
  { href: "/admin/recharge-cards", label: "Recharge cards", icon: CreditCard },
  { href: "/admin/settings", label: "Settings", icon: Settings }
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20 lg:pb-0">
      <aside className="fixed left-0 top-0 hidden h-screen w-72 border-r border-slate-200 bg-white p-6 lg:block">
        <Logo />
        <nav className="mt-8 space-y-2">
          {adminLinks.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium ${
                  active ? "bg-brand-50 text-brand-700" : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <button onClick={logout} className="absolute bottom-6 flex w-[calc(100%-3rem)] items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100">
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </aside>
      <main className="lg:ml-72">
        <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 px-4 py-4 backdrop-blur lg:hidden">
          <div className="flex items-center justify-between">
            <Logo />
            <Menu className="h-5 w-5 text-slate-500" />
          </div>
        </header>
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">{children}</div>
      </main>
      <nav className="fixed bottom-0 left-0 right-0 z-20 grid grid-cols-5 border-t border-slate-200 bg-white lg:hidden">
        {adminLinks.slice(0, 5).map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href));
          return (
            <Link key={item.href} href={item.href} className={`flex flex-col items-center gap-1 px-2 py-3 text-[11px] ${active ? "text-brand-700" : "text-slate-500"}`}>
              <Icon className="h-5 w-5" />
              <span className="max-w-full truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
