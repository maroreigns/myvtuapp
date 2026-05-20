import { NextRequest } from "next/server";
import { requireUser, hashPassword, verifyPassword } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { changePasswordSchema } from "@/lib/validators";

export async function PATCH(request: NextRequest) {
  const user = await requireUser(request);
  if (!user) return jsonError("Unauthorized", 401);

  const body = changePasswordSchema.safeParse(await request.json());
  if (!body.success) return jsonError(body.error.errors[0]?.message || "Invalid request", 422);

  const account = await prisma.user.findUnique({ where: { id: user.id } });
  if (!account || !(await verifyPassword(body.data.currentPassword, account.passwordHash))) {
    return jsonError("Current password is incorrect", 400);
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(body.data.newPassword) }
  });

  return jsonOk({ message: "Password changed successfully" });
}
