import { NextRequest } from "next/server";
import { jsonError, jsonOk, readJsonBody } from "@/lib/http";
import { verifyEmailSchema } from "@/lib/validators";
import { verifyEmailToken } from "@/services/email/verification.service";

export async function POST(request: NextRequest) {
  const payload = await readJsonBody(request);
  if (!payload) return jsonError("Invalid or empty request body", 400);
  const body = verifyEmailSchema.safeParse(payload);
  if (!body.success) return jsonError(body.error.errors[0]?.message || "Invalid request", 422);

  const user = await verifyEmailToken(body.data.token);
  if (!user) return jsonError("Verification link is invalid or expired", 400);

  return jsonOk({ message: "Email verified successfully" });
}
