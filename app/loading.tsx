import { AnimatedLogo } from "@/components/Logo";

export default function Loading() {
  return (
    <main className="grid min-h-screen place-items-center bg-white px-4">
      <div className="space-y-4 text-center">
        <AnimatedLogo />
        <p className="text-sm font-medium text-slate-500">Secure digital payments, airtime and data.</p>
      </div>
    </main>
  );
}
