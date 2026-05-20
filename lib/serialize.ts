import { Prisma } from "@prisma/client";

export function money(value: Prisma.Decimal | number | string) {
  return Number(value);
}

export function formatNetwork(network?: string | null) {
  if (!network) return "";
  return network === "NINE_MOBILE" ? "9mobile" : network[0] + network.slice(1).toLowerCase();
}
