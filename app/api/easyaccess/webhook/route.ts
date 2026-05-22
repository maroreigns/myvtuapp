import { NextRequest } from "next/server";
import { Prisma, ServiceType, TransactionStatus } from "@prisma/client";
import { jsonError, jsonOk, readJsonBody } from "@/lib/http";
import { prisma } from "@/lib/prisma";

function normalizeStatus(value: unknown) {
  const status = String(value || "").toLowerCase();
  if (["success", "successful", "completed", "delivered"].includes(status)) return TransactionStatus.SUCCESSFUL;
  if (["failed", "fail", "declined", "cancelled", "canceled", "reversed"].includes(status)) return TransactionStatus.FAILED;
  return TransactionStatus.PENDING;
}

function textValue(value: unknown) {
  return value === undefined || value === null ? "" : String(value);
}

export async function POST(request: NextRequest) {
  const payload = await readJsonBody(request);
  if (!payload || typeof payload !== "object") return jsonError("Invalid webhook payload", 400);

  const body = payload as Record<string, unknown>;
  const reference = textValue(body.client_reference || body.reference || body.transaction_reference);
  if (!reference) return jsonError("Missing transaction reference", 422);

  const transaction = await prisma.serviceTransaction.findUnique({ where: { reference } });
  if (!transaction) return jsonOk({ received: true, matched: false });

  const status = normalizeStatus(body.status || body.Status || body.response);
  const providerReference = textValue(body.provider_reference || body.providerReference || body.transaction_id || body.id || transaction.providerReference);
  const message = textValue(body.message || body.Message || body.description || transaction.responseMessage);

  const updated = await prisma.serviceTransaction.update({
    where: { id: transaction.id },
    data: {
      status,
      providerReference: providerReference || transaction.providerReference,
      responseMessage: message || transaction.responseMessage
    }
  });

  await prisma.vtuApiLog.create({
    data: {
      serviceTransactionId: transaction.id,
      provider: "easyaccess",
      serviceType: transaction.serviceType as ServiceType,
      requestPayload: { webhook: true, reference },
      responsePayload: body as Prisma.InputJsonValue,
      status,
      error: status === TransactionStatus.FAILED ? message || "EasyAccessAPI webhook marked transaction failed" : null
    }
  });

  return jsonOk({ received: true, matched: true, status: updated.status });
}
