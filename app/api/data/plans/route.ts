import { NextRequest } from "next/server";
import { Network } from "@prisma/client";
import { jsonError, jsonOk } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { vtuService } from "@/services/vtu.service";

export const dynamic = "force-dynamic";

function isNetwork(value: string | null): value is Network {
  return value === "MTN" || value === "GLO" || value === "AIRTEL" || value === "NINE_MOBILE";
}

export async function GET(request: NextRequest) {
  const network = request.nextUrl.searchParams.get("network");
  if (network && !isNetwork(network)) return jsonError("Unsupported data network", 422);
  const selectedNetwork: Network | undefined = isNetwork(network) ? network : undefined;

  try {
    const result = await vtuService.syncDataPlans(selectedNetwork);
    if (result.synced === 0) {
      return jsonError("No EasyAccess data plans are available for this network right now.", 503);
    }

    const plans = await prisma.dataPlan.findMany({
      where: { isActive: true, providerCode: { in: result.providerCodes }, ...(selectedNetwork ? { network: selectedNetwork } : {}) },
      orderBy: [{ network: "asc" }, { sellingPrice: "asc" }]
    });

    return jsonOk({
      source: "easyaccess",
      plans: plans.map((plan) => ({
        id: plan.id,
        network: plan.network,
        name: plan.name,
        dataSize: plan.dataSize,
        validity: plan.validity,
        providerCode: plan.providerCode,
        sellingPrice: Number(plan.sellingPrice)
      }))
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "EasyAccess data plans could not be loaded";
    console.error("EasyAccessAPI data plan fetch failed", error);
    return jsonError(message, 502);
  }
}
