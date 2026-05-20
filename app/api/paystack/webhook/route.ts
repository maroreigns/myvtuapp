import crypto from "crypto";
import { NextRequest } from "next/server";
import { TransactionStatus } from "@prisma/client";
import { jsonError, jsonOk } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { markPaymentSuccessful } from "@/lib/payments";

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

  const event = JSON.parse(rawBody) as {
    event: string;
    data: { reference: string; status: string; id?: number; paid_at?: string; amount?: number; gateway_response?: string };
  };

  const payment = await prisma.payment.findUnique({ where: { reference: event.data.reference } });
  if (!payment) return jsonOk({ received: true });

  if (event.event === "charge.success" && event.data.status === "success") {
    await markPaymentSuccessful({
      payment,
      amount: event.data.amount ? event.data.amount / 100 : undefined,
      gatewayReference: event.data.id ? String(event.data.id) : undefined,
      paidAt: event.data.paid_at
    });
    return jsonOk({ received: true });
  }

  if (["charge.failed", "transfer.failed"].includes(event.event)) {
    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: TransactionStatus.FAILED, failureReason: event.data.gateway_response || "Paystack reported failure" }
    });
  }

  return jsonOk({ received: true });
}
