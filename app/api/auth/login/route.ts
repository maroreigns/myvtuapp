import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { setAuthCookie, signAuthToken, verifyPassword } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";
import { loginSchema } from "@/lib/validators";

export async function POST(request: NextRequest) {
  if (rateLimit(request, "auth:login", 10, 60_000).limited) return jsonError("Too many attempts", 429);

  const body = loginSchema.safeParse(await request.json());
  if (!body.success) return jsonError("Invalid credentials", 401);

  const user = await prisma.user.findUnique({ where: { email: body.data.email } });
  if (!user || !(await verifyPassword(body.data.password, user.passwordHash))) {
    return jsonError("Invalid credentials", 401);
  }

  setAuthCookie(signAuthToken(user));
  return jsonOk({
    user: {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      role: user.role,
      walletBalance: Number(user.walletBalance)
    }
  });
}
