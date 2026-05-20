import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, setAuthCookie, signAuthToken } from "@/lib/auth";
import { jsonOk, readJsonBody } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";
import { createReference } from "@/lib/reference";
import { registerSchema } from "@/lib/validators";
import { createEmailVerificationToken, sendEmailVerification } from "@/services/email/verification.service";
import { smsService } from "@/services/sms/sms.service";

function registerError(message: string, status = 400) {
  return jsonOk({ success: false, message, error: message }, status);
}

async function createUniqueReferralCode() {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const referralCode = createReference("REF");
    const existing = await prisma.user.findUnique({ where: { referralCode } });
    if (!existing) return referralCode;
  }
  throw new Error("Could not generate referral code");
}

export async function POST(request: NextRequest) {
  try {
    console.log("[register] request received");
    if (rateLimit(request, "auth:register", 8, 60_000).limited) {
      console.warn("[register] rate limit exceeded");
      return registerError("Too many attempts. Please wait and try again.", 429);
    }

    const payload = await readJsonBody(request);
    if (!payload) {
      console.warn("[register] empty or invalid JSON body");
      return registerError("Invalid or empty request body", 400);
    }

    const body = registerSchema.safeParse(payload);
    if (!body.success) {
      const message = body.error.errors[0]?.message || "Invalid registration details";
      console.warn("[register] validation failed", message);
      return registerError(message, 422);
    }
    console.log("[register] validation passed", { email: body.data.email, phone: body.data.phone });

    const existing = await prisma.user.findFirst({
      where: { OR: [{ email: body.data.email }, { phone: body.data.phone }] }
    });
    if (existing) {
      console.warn("[register] duplicate email or phone", { email: body.data.email, phone: body.data.phone });
      return registerError("Email or phone is already registered", 409);
    }

    const referrer = body.data.referralCode
      ? await prisma.user.findUnique({ where: { referralCode: body.data.referralCode } })
      : null;
    console.log("[register] referrer lookup completed", { hasReferralCode: Boolean(body.data.referralCode), referrerFound: Boolean(referrer) });

    const passwordHash = await hashPassword(body.data.password);
    const referralCode = await createUniqueReferralCode();

    const user = await prisma.user.create({
      data: {
        fullName: body.data.fullName,
        email: body.data.email,
        phone: body.data.phone,
        passwordHash,
        referralCode,
        referredById: referrer?.id
      },
      select: { id: true, fullName: true, email: true, phone: true, role: true, walletBalance: true }
    });
    console.log("[register] user created", { userId: user.id, email: user.email });

    try {
      console.log("[register] creating email verification token", { userId: user.id });
      const token = await createEmailVerificationToken(user.id);
      console.log("[register] email verification token created", { userId: user.id });

      try {
        await sendEmailVerification(user, token);
        console.log("[register] verification email queued", { userId: user.id, email: user.email });
      } catch (error) {
        console.error("[register] verification email failed", { userId: user.id, error });
      }
    } catch (error) {
      console.error("[register] verification token creation failed", { userId: user.id, error });
    }

    try {
      await smsService.send({ userId: user.id, phone: user.phone, message: "Welcome to NaijaDataHub. Please verify your email to start transacting." });
      console.log("[register] welcome SMS logged", { userId: user.id, phone: user.phone });
    } catch (error) {
      console.error("[register] welcome SMS failed", { userId: user.id, error });
    }

    let signedIn = false;
    try {
      setAuthCookie(signAuthToken(user));
      signedIn = true;
      console.log("[register] auth cookie set", { userId: user.id });
    } catch (error) {
      console.error("[register] auth cookie could not be set", { userId: user.id, error });
    }

    return jsonOk({
      success: true,
      message: "Account created successfully. Please verify your email.",
      signedIn,
      user
    }, 201);
  } catch (error) {
    console.error("Registration failed", error);
    return registerError("Account could not be created. Please try again.", 500);
  }
}
