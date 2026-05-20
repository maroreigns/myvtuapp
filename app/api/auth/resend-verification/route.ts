import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/http";
import { createEmailVerification } from "@/services/email/verification.service";

export async function POST(request: NextRequest) {
  const user = await requireUser(request);
  if (!user) return jsonError("Unauthorized", 401);
  if (user.emailVerifiedAt) return jsonOk({ message: "Email is already verified" });

  await createEmailVerification(user);
  return jsonOk({ message: "Verification email sent" });
}
