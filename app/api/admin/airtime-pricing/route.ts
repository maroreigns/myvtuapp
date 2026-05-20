import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { airtimePricingSchema } from "@/lib/validators";

export async function PATCH(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin) return jsonError("Admin access required", 403);

  const body = airtimePricingSchema.safeParse(await request.json());
  if (!body.success) return jsonError(body.error.errors[0]?.message || "Invalid request", 422);

  const pricing = await prisma.airtimePricing.upsert({
    where: { network: body.data.network },
    update: body.data,
    create: body.data
  });

  return jsonOk({ pricing });
}
