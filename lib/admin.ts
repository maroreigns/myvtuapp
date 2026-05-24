import { TransactionStatus } from "@prisma/client";

const sensitiveKeyPattern = /(secret|authorization|token|key|password|pin|access_code|signature|authorization_url)/i;

export function formatNaira(value: number | string | null | undefined) {
  return `NGN ${Number(value || 0).toLocaleString()}`;
}

export function statusBadgeClass(status: TransactionStatus | string) {
  switch (status) {
    case TransactionStatus.SUCCESSFUL:
      return "bg-emerald-100 text-emerald-700 ring-emerald-200";
    case TransactionStatus.FAILED:
      return "bg-rose-100 text-rose-700 ring-rose-200";
    case TransactionStatus.PENDING:
      return "bg-amber-100 text-amber-800 ring-amber-200";
    case TransactionStatus.REFUNDED:
      return "bg-sky-100 text-sky-700 ring-sky-200";
    default:
      return "bg-slate-100 text-slate-700 ring-slate-200";
  }
}

export function activeVtuProviderName(provider?: string | null) {
  return provider?.toLowerCase() === "easyaccess" ? "vtpass" : provider || "vtpass";
}

export function summarizeProviderResponse(value: unknown, fallback?: string | null) {
  if (!value) return fallback || "N/A";

  if (typeof value === "string") return value.slice(0, 180);
  if (typeof value !== "object" || Array.isArray(value)) return String(value).slice(0, 180);

  const input = value as Record<string, unknown>;
  const summary: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(input)) {
    if (sensitiveKeyPattern.test(key)) continue;
    if (entry === null || entry === undefined) continue;
    if (typeof entry === "object") continue;
    summary[key] = entry;
  }

  const text = Object.keys(summary).length ? JSON.stringify(summary) : fallback || "Provider response stored";
  return text.length > 180 ? `${text.slice(0, 177)}...` : text;
}
