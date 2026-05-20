import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonOk } from "@/lib/http";

export async function GET(request: NextRequest) {
  const network = request.nextUrl.searchParams.get("network");
  const plans = await prisma.dataPlan.findMany({
    where: { isActive: true, ...(network ? { network: network as never } : {}) },
    orderBy: [{ network: "asc" }, { sellingPrice: "asc" }]
  });

  return jsonOk({
    plans: plans.map((plan) => ({
      ...plan,
      providerCost: Number(plan.providerCost),
      sellingPrice: Number(plan.sellingPrice)
    }))
  });
}
