import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { dataPlanSchema } from "@/lib/validators";

export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin) return jsonError("Admin access required", 403);

  const plans = await prisma.dataPlan.findMany({ orderBy: [{ network: "asc" }, { sellingPrice: "asc" }] });
  return jsonOk({
    plans: plans.map((plan) => ({
      ...plan,
      providerCost: Number(plan.providerCost),
      sellingPrice: Number(plan.sellingPrice),
      profitMargin: Number(plan.sellingPrice.minus(plan.providerCost))
    }))
  });
}

export async function POST(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin) return jsonError("Admin access required", 403);

  const body = dataPlanSchema.safeParse(await request.json());
  if (!body.success) return jsonError(body.error.errors[0]?.message || "Invalid request", 422);

  const plan = await prisma.dataPlan.create({ data: body.data });
  return jsonOk({ plan: { ...plan, providerCost: Number(plan.providerCost), sellingPrice: Number(plan.sellingPrice) } }, 201);
}
