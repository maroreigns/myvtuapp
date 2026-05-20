import { NextRequest } from "next/server";
import { jsonError, jsonOk, readJsonBody } from "@/lib/http";
import { resetPasswordSchema } from "@/lib/validators";

export async function POST(request: NextRequest) {
  const payload = await readJsonBody(request);
  if (!payload) return jsonError("Invalid or empty request body", 400);
  const body = resetPasswordSchema.safeParse(payload);
  if (!body.success) return jsonError(body.error.errors[0]?.message || "Invalid request", 422);
  return jsonOk({ message: "Password reset flow is mocked. Add token persistence before production launch." });
}
