import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { dataPlanSchema } from "@/lib/validators";

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const admin = await requireAdmin(request);
  if (!admin) return jsonError("Admin access required", 403);

  const body = dataPlanSchema.partial().safeParse(await request.json());
  if (!body.success) return jsonError(body.error.errors[0]?.message || "Invalid request", 422);

  const plan = await prisma.dataPlan.update({ where: { id: params.id }, data: body.data });
  return jsonOk({ plan: { ...plan, providerCost: Number(plan.providerCost), sellingPrice: Number(plan.sellingPrice) } });
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const admin = await requireAdmin(request);
  if (!admin) return jsonError("Admin access required", 403);

  await prisma.dataPlan.delete({ where: { id: params.id } });
  return jsonOk({ ok: true });
}
