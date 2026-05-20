import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { userStatusSchema } from "@/lib/validators";

export async function POST(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin) return jsonError("Admin access required", 403);

  const body = userStatusSchema.safeParse(await request.json());
  if (!body.success) return jsonError(body.error.errors[0]?.message || "Invalid request", 422);
  if (body.data.userId === admin.id) return jsonError("You cannot deactivate your own admin account", 400);

  const user = await prisma.user.update({
    where: { id: body.data.userId },
    data: { isActive: body.data.isActive }
  });

  return jsonOk({ user: { id: user.id, isActive: user.isActive } });
}
