import { NextRequest } from "next/server";
import { jsonError, jsonOk } from "@/lib/http";
import { resetPasswordSchema } from "@/lib/validators";

export async function POST(request: NextRequest) {
  const body = resetPasswordSchema.safeParse(await request.json());
  if (!body.success) return jsonError(body.error.errors[0]?.message || "Invalid request", 422);
  return jsonOk({ message: "Password reset flow is mocked. Add token persistence before production launch." });
}
