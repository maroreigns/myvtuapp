import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonError, jsonOk } from "@/lib/http";
import { vtuService } from "@/services/vtu.service";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const network = request.nextUrl.searchParams.get("network");
  let providerCodes: string[] = [];
  try {
    const result = await vtuService.syncDataPlans(network || undefined);
    providerCodes = result.providerCodes;
  } catch (error) {
    console.error("[plans] VTpass data plan sync failed", error);
    return jsonError("Data plans could not be loaded right now. Please try again shortly.", 502);
  }

  const plans = await prisma.dataPlan.findMany({
    where: { isActive: true, providerCode: { in: providerCodes }, ...(network ? { network: network as never } : {}) },
    orderBy: [{ network: "asc" }, { sellingPrice: "asc" }]
  });

  return jsonOk({
    source: "vtpass",
    plans: plans.map((plan) => ({
      ...plan,
      providerCost: Number(plan.providerCost),
      sellingPrice: Number(plan.sellingPrice)
    }))
  });
}
