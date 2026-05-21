import Link from "next/link";

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2 font-bold text-slate-950">
      <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand-600 text-white">OBM</span>
      <span>Obmapay</span>
    </Link>
  );
}
