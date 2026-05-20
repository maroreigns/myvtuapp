import { NextRequest } from "next/server";
import { PaymentGateway, TransactionStatus } from "@prisma/client";
import { requireUser } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { createReference } from "@/lib/reference";
import { fundWalletSchema } from "@/lib/validators";
import { flutterwaveService } from "@/services/flutterwave.service";
import { paystackService } from "@/services/paystack.service";

export async function POST(request: NextRequest) {
  if (rateLimit(request, "wallet:fund", 20, 60_000).limited) return jsonError("Too many funding attempts", 429);

  const user = await requireUser(request);
  if (!user) return jsonError("Unauthorized", 401);
  if (!user.emailVerifiedAt) return jsonError("Please verify your email before funding your wallet", 403);

  const body = fundWalletSchema.safeParse(await request.json());
  if (!body.success) return jsonError(body.error.errors[0]?.message || "Invalid request", 422);

  const reference = createReference("PAY");
  const payment = await prisma.payment.create({
    data: {
      userId: user.id,
      amount: body.data.amount,
      gateway: body.data.gateway,
      reference,
      status: TransactionStatus.PENDING
    }
  });

  const gateway =
    body.data.gateway === PaymentGateway.PAYSTACK
      ? await paystackService.initializePayment({ email: user.email, amount: body.data.amount, reference })
      : await flutterwaveService.initializePayment({ email: user.email, amount: body.data.amount, reference });

  return jsonOk({ payment: { ...payment, amount: Number(payment.amount) }, gateway }, 201);
}
