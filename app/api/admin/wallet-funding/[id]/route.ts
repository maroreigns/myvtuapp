import { NextRequest } from "next/server";
import { Prisma, TransactionStatus } from "@prisma/client";
import { requireAdmin } from "@/lib/auth";
import { finalizePaystackWalletFunding } from "@/lib/payments";
import { jsonError, jsonOk } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { paystackService } from "@/services/paystack.service";

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const admin = await requireAdmin(request);
  if (!admin) return jsonError("Admin access required", 403);

  const payment = await prisma.payment.findUnique({ where: { id: params.id } });
  if (!payment) return jsonError("Payment not found", 404);
  if (payment.gateway !== "PAYSTACK") return jsonError("Only Paystack payments can be verified here", 400);
  if (payment.status !== TransactionStatus.PENDING) return jsonError("Only pending payments can be retried", 400);

  const verification = await paystackService.verifyPayment(payment.reference);
  const result = await finalizePaystackWalletFunding({
    reference: payment.reference,
    status: verification.status,
    amountKobo: verification.amountKobo,
    gatewayReference: verification.gatewayReference,
    paidAt: verification.paidAt,
    message: verification.message,
    rawResponse: verification.raw as Prisma.InputJsonValue | null,
    verified: verification.verified
  });

  return jsonOk({
    payment: {
      id: result.payment.id,
      status: result.payment.status,
      amount: Number(result.payment.amount),
      reference: result.payment.reference
    },
    alreadyProcessed: result.alreadyProcessed || false,
    pending: result.pending || false,
    failed: result.failed || false
  });
}
