import crypto from "crypto";
import { NextRequest } from "next/server";
import { PaymentGateway, Prisma, TransactionStatus } from "@prisma/client";
import { jsonError, jsonOk } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { finalizePaystackWalletFunding, markPaymentFailed } from "@/lib/payments";

function verifySignature(rawBody: string, signature: string | null) {
  const secret = process.env.PAYSTACK_WEBHOOK_SECRET || process.env.PAYSTACK_SECRET_KEY;
  if (!secret || !signature) return false;
  const hash = crypto.createHmac("sha512", secret).update(rawBody).digest("hex");
  if (hash.length !== signature.length) return false;
  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(signature));
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  if (!verifySignature(rawBody, request.headers.get("x-paystack-signature"))) {
    return jsonError("Invalid webhook signature", 401);
  }

  let event: {
    event: string;
    data: { reference?: string; status?: string; id?: number; paid_at?: string; amount?: number; gateway_response?: string };
  };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return jsonError("Invalid webhook payload", 400);
  }

  if (!event.data.reference) return jsonOk({ received: true });

  const payment = await prisma.payment.findUnique({ where: { reference: event.data.reference } });
  if (!payment) return jsonOk({ received: true });
  if (payment.gateway !== PaymentGateway.PAYSTACK) return jsonOk({ received: true });

  if (event.event === "charge.success" && event.data.status === "success") {
    try {
      await finalizePaystackWalletFunding({
        reference: event.data.reference,
        status: event.data.status,
        amountKobo: event.data.amount ?? 0,
        gatewayReference: event.data.id ? String(event.data.id) : undefined,
        paidAt: event.data.paid_at,
        rawResponse: event as Prisma.InputJsonValue,
        verified: true
      });
    } catch (error) {
      await markPaymentFailed({
        paymentId: payment.id,
        failureReason: error instanceof Error ? error.message : "Paystack webhook processing failed",
        gatewayReference: event.data.id ? String(event.data.id) : undefined,
        rawResponse: event as Prisma.InputJsonValue
      });
    }
    return jsonOk({ received: true });
  }

  if (["charge.failed", "transfer.failed"].includes(event.event)) {
    if (payment.status !== TransactionStatus.SUCCESSFUL) {
      await markPaymentFailed({
        paymentId: payment.id,
        failureReason: event.data.gateway_response || "Paystack reported failure",
        gatewayReference: event.data.id ? String(event.data.id) : undefined,
        rawResponse: event as Prisma.InputJsonValue
      });
    }
  }

  return jsonOk({ received: true });
}
