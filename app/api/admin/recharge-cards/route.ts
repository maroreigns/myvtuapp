import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { rechargeCardBatchSchema } from "@/lib/validators";

export async function POST(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin) return jsonError("Admin access required", 403);

  const body = rechargeCardBatchSchema.safeParse(await request.json());
  if (!body.success) return jsonError(body.error.errors[0]?.message || "Invalid request", 422);

  const batch = await prisma.rechargeCardBatch.create({
    data: {
      name: body.data.name,
      network: body.data.network,
      denomination: body.data.denomination,
      cards: { create: body.data.cards }
    },
    include: { cards: true }
  });

  return jsonOk({ batch }, 201);
}
