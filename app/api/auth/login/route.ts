import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { setAuthCookie, signAuthToken, verifyPassword } from "@/lib/auth";
import { jsonOk, readJsonBody } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";
import { loginSchema } from "@/lib/validators";

function loginError(message: string, status = 400) {
  return jsonOk({ success: false, message, error: message }, status);
}

export async function POST(request: NextRequest) {
  try {
    console.log("[login] request received");
    if (rateLimit(request, "auth:login", 10, 60_000).limited) {
      console.warn("[login] rate limit exceeded");
      return loginError("Too many attempts. Please wait and try again.", 429);
    }

    const payload = await readJsonBody(request);
    if (!payload) {
      console.warn("[login] empty or invalid JSON body");
      return loginError("Invalid email or password", 401);
    }

    const body = loginSchema.safeParse(payload);
    if (!body.success) {
      console.warn("[login] validation failed");
      return loginError("Invalid email or password", 401);
    }
    console.log("[login] validation passed", { identifier: body.data.email });

    const user = await prisma.user.findFirst({
      where: { OR: [{ email: body.data.email }, { phone: body.data.email }] }
    });
    if (!user) {
      console.warn("[login] user not found", { identifier: body.data.email });
      return loginError("Invalid email or password", 401);
    }
    console.log("[login] user found", { userId: user.id, email: user.email, isActive: user.isActive, emailVerified: Boolean(user.emailVerifiedAt) });

    const passwordValid = await verifyPassword(body.data.password, user.passwordHash);
    if (!passwordValid) {
      console.warn("[login] password mismatch", { userId: user.id });
      return loginError("Invalid email or password", 401);
    }
    console.log("[login] password verified", { userId: user.id });

    if (!user.isActive) {
      console.warn("[login] account disabled", { userId: user.id });
      return loginError("Account disabled", 403);
    }

    if (!process.env.JWT_SECRET) {
      console.error("[login] JWT_SECRET missing");
      return loginError("Login is not configured. Please contact support.", 500);
    }

    const token = signAuthToken(user);
    setAuthCookie(token);
    console.log("[login] auth cookie set", { userId: user.id });

    const message = user.emailVerifiedAt
      ? "Welcome back"
      : "Welcome back. Please verify your email to unlock wallet funding and purchases.";

    return jsonOk({
      success: true,
      message,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        role: user.role,
        walletBalance: Number(user.walletBalance),
        emailVerified: Boolean(user.emailVerifiedAt)
      }
    });
  } catch (error) {
    console.error("Login failed", error);
    return loginError("Login failed. Please try again.", 500);
  }
}
