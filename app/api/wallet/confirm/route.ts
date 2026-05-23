import { NextRequest } from "next/server";
import { PaymentGateway, Prisma, TransactionStatus } from "@prisma/client";
import { requireUser } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { confirmPaymentSchema } from "@/lib/validators";
import { markPaymentFailed, markPaymentSuccessful } from "@/lib/payments";
import { flutterwaveService } from "@/services/flutterwave.service";
import { paystackService } from "@/services/paystack.service";

export async function POST(request: NextRequest) {
  const user = await requireUser(request);
  if (!user) return jsonError("Unauthorized", 401);

  const body = confirmPaymentSchema.safeParse(await request.json());
  if (!body.success) return jsonError(body.error.errors[0]?.message || "Invalid request", 422);

  const payment = await prisma.payment.findUnique({ where: { reference: body.data.reference } });
  if (!payment || payment.userId !== user.id) return jsonError("Payment not found", 404);
  if (payment.status === TransactionStatus.SUCCESSFUL) return jsonOk({ alreadyProcessed: true });

  const verification =
    payment.gateway === PaymentGateway.PAYSTACK
      ? await paystackService.verifyPayment(payment.reference)
      : await flutterwaveService.verifyPayment(payment.reference);

  const rawResponse = "raw" in verification ? (verification.raw as Prisma.InputJsonValue | null) : undefined;
  const amountKobo = "amountKobo" in verification ? verification.amountKobo : undefined;
  const validStatus = ["success", "successful"].includes(verification.status);
  const validReference = verification.reference === payment.reference;
  const validAmount =
    payment.gateway !== PaymentGateway.PAYSTACK || amountKobo === Math.round(Number(payment.amount) * 100);

  if (!validStatus || !validReference || !validAmount) {
    await markPaymentFailed({
      paymentId: payment.id,
      failureReason: verification.message || "Payment verification failed",
      gatewayReference: "gatewayReference" in verification ? verification.gatewayReference : undefined,
      rawResponse
    });
    return jsonError("Payment verification failed", 400);
  }

  const walletTransaction = await markPaymentSuccessful({
    payment,
    amountKobo,
    gatewayReference: "gatewayReference" in verification ? verification.gatewayReference : undefined,
    paidAt: verification.paidAt,
    rawResponse
  });

  if (!walletTransaction) return jsonError("Payment reference could not be processed", 409);

  return jsonOk({ walletTransaction: { ...walletTransaction, amount: Number(walletTransaction.amount) } });
}
