import { NextRequest } from "next/server";
import { jsonOk, readJsonBody } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";
import { forgotPasswordSchema } from "@/lib/validators";

export async function POST(request: NextRequest) {
  if (rateLimit(request, "auth:forgot", 6, 60_000).limited) {
    return jsonOk({ message: "If the email exists, reset instructions will be sent." });
  }

  const payload = await readJsonBody(request);
  if (payload) forgotPasswordSchema.safeParse(payload);
  return jsonOk({
    message: "If the email exists, reset instructions will be sent.",
    mockResetToken: "mock-reset-token-use-real-email-provider-later"
  });
}
