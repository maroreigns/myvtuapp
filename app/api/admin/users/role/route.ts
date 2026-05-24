import { NextRequest } from "next/server";
import { Role } from "@prisma/client";
import { requireAdmin } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { userRoleSchema } from "@/lib/validators";

export async function POST(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin) return jsonError("Admin access required", 403);

  const body = userRoleSchema.safeParse(await request.json());
  if (!body.success) return jsonError(body.error.errors[0]?.message || "Invalid request", 422);
  if (body.data.role !== Role.ADMIN) return jsonError("Only admin promotion is supported", 400);

  const user = await prisma.user.update({
    where: { id: body.data.userId },
    data: { role: Role.ADMIN },
    select: { id: true, role: true }
  });

  return jsonOk({ user });
}
