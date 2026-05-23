import { NextRequest } from "next/server";
import { PaymentGateway, TransactionStatus } from "@prisma/client";
import { requireUser } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/http";
import { markPaymentFailed, markPaymentInitialization } from "@/lib/payments";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { createReference } from "@/lib/reference";
import { fundWalletSchema } from "@/lib/validators";
import { paystackService } from "@/services/paystack.service";

export async function POST(request: NextRequest) {
  if (rateLimit(request, "wallet:fund", 20, 60_000).limited) return jsonError("Too many funding attempts", 429);

  const user = await requireUser(request);
  if (!user) return jsonError("Unauthorized", 401);

  const body = fundWalletSchema.safeParse(await request.json());
  if (!body.success) return jsonError(body.error.errors[0]?.message || "Invalid request", 422);

  const reference = createReference("PAY");
  const payment = await prisma.payment.create({
    data: {
      userId: user.id,
      amount: body.data.amount,
      gateway: PaymentGateway.PAYSTACK,
      reference,
      status: TransactionStatus.PENDING
    }
  });

  try {
    const gateway = await paystackService.initializePayment({ email: user.email, amount: body.data.amount, reference });
    await markPaymentInitialization({
      paymentId: payment.id,
      gatewayReference: gateway.reference,
      rawResponse: gateway.raw
    });

    return jsonOk({
      payment: { ...payment, amount: Number(payment.amount), gateway: PaymentGateway.PAYSTACK },
      gateway,
      authorization_url: gateway.authorizationUrl
    }, 201);
  } catch (error) {
    const raw = error instanceof Error ? (error as Error & { raw?: unknown }).raw : undefined;
    await markPaymentFailed({
      paymentId: payment.id,
      failureReason: error instanceof Error ? error.message : "Paystack payment initialization failed",
      rawResponse: raw === undefined ? undefined : raw
    });
    return jsonError(error instanceof Error ? error.message : "Paystack payment initialization failed", 502);
  }
}
