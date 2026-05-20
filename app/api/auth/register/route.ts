import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, setAuthCookie, signAuthToken } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";
import { registerSchema } from "@/lib/validators";

export async function POST(request: NextRequest) {
  if (rateLimit(request, "auth:register", 8, 60_000).limited) return jsonError("Too many attempts", 429);

  const body = registerSchema.safeParse(await request.json());
  if (!body.success) return jsonError(body.error.errors[0]?.message || "Invalid request", 422);

  const existing = await prisma.user.findFirst({
    where: { OR: [{ email: body.data.email }, { phone: body.data.phone }] }
  });
  if (existing) return jsonError("Email or phone is already registered", 409);

  const user = await prisma.user.create({
    data: {
      fullName: body.data.fullName,
      email: body.data.email,
      phone: body.data.phone,
      passwordHash: await hashPassword(body.data.password)
    },
    select: { id: true, fullName: true, email: true, phone: true, role: true, walletBalance: true }
  });

  setAuthCookie(signAuthToken(user));
  return jsonOk({ user }, 201);
}
