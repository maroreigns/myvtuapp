import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { profileSchema } from "@/lib/validators";

export async function PATCH(request: NextRequest) {
  const user = await requireUser(request);
  if (!user) return jsonError("Unauthorized", 401);

  const body = profileSchema.safeParse(await request.json());
  if (!body.success) return jsonError(body.error.errors[0]?.message || "Invalid request", 422);

  const existing = await prisma.user.findFirst({
    where: { phone: body.data.phone, id: { not: user.id } }
  });
  if (existing) return jsonError("Phone number already belongs to another account", 409);

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: body.data,
    select: { id: true, fullName: true, email: true, phone: true, role: true, walletBalance: true }
  });

  return jsonOk({ user: { ...updated, walletBalance: Number(updated.walletBalance) } });
}
