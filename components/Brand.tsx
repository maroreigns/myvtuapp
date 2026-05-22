import Link from "next/link";

type BrandWordmarkProps = {
  className?: string;
};

export function BrandWordmark({ className = "" }: BrandWordmarkProps) {
  return (
    <span className={className}>
      Obma<span className="text-brand-600">P</span>ay
    </span>
  );
}

export function LogoIcon({ animated = false }: { animated?: boolean }) {
  return (
    <span
      className={`grid h-9 w-9 place-items-center rounded-lg bg-brand-600 text-xs font-black tracking-normal text-white shadow-sm ${
        animated ? "animate-[brandFloat_2.8s_ease-in-out_infinite]" : ""
      }`}
    >
      OBM
    </span>
  );
}

export function Logo({ href = "/", className = "" }: { href?: string; className?: string }) {
  return (
    <Link href={href} className={`flex items-center gap-2 font-bold text-slate-950 ${className}`}>
      <LogoIcon />
      <BrandWordmark />
    </Link>
  );
}

export function AnimatedLogo() {
  return (
    <div className="flex flex-col items-center gap-3 text-center">
      <LogoIcon animated />
      <BrandWordmark className="text-xl font-bold text-slate-950" />
    </div>
  );
}
