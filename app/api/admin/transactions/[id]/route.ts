import { NextRequest } from "next/server";
import { TransactionStatus, WalletTransactionType } from "@prisma/client";
import { requireAdmin } from "@/lib/auth";
import { summarizeProviderResponse } from "@/lib/admin";
import { jsonError, jsonOk } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { transactionStatusSchema } from "@/lib/validators";
import { recordWalletChange } from "@/lib/wallet";
import { vtuService } from "@/services/vtu.service";

function objectValue(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function textValue(value: unknown) {
  return value === undefined || value === null ? "" : String(value);
}

function transactionPayload(transaction: {
  id: string;
  reference: string;
  providerReference: string | null;
  status: TransactionStatus;
  amount: unknown;
  providerCost?: unknown;
  profit?: unknown;
  responseMessage: string | null;
}) {
  return {
    id: transaction.id,
    reference: transaction.reference,
    providerReference: transaction.providerReference,
    status: transaction.status,
    amount: Number(transaction.amount),
    providerCost: transaction.providerCost === undefined ? undefined : Number(transaction.providerCost),
    profit: transaction.profit === undefined ? undefined : Number(transaction.profit),
    responseSummary: summarizeProviderResponse(transaction.responseMessage)
  };
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const admin = await requireAdmin(request);
  if (!admin) return jsonError("Admin access required", 403);

  const body = transactionStatusSchema.safeParse(await request.json());
  if (!body.success) return jsonError(body.error.errors[0]?.message || "Invalid request", 422);

  const transaction = await prisma.serviceTransaction.update({
    where: { id: params.id },
    data: { status: body.data.status }
  });

  return jsonOk({ transaction: transactionPayload(transaction) });
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const admin = await requireAdmin(request);
  if (!admin) return jsonError("Admin access required", 403);

  const action = request.nextUrl.searchParams.get("action");
  const transaction = await prisma.serviceTransaction.findUnique({
    where: { id: params.id },
    include: { plan: true, vtuLogs: { orderBy: { createdAt: "desc" }, take: 1 } }
  });
  if (!transaction) return jsonError("Transaction not found", 404);

  if (action === "refund") {
    if (transaction.status === TransactionStatus.REFUNDED) return jsonError("Transaction already refunded", 409);

    const refunded = await prisma.$transaction(async (tx) => {
      await recordWalletChange({
        tx,
        userId: transaction.userId,
        type: WalletTransactionType.CREDIT,
        amount: transaction.amount,
        reference: `${transaction.reference}-ADMIN-REFUND`,
        description: `Admin refund for ${transaction.reference}`,
        status: TransactionStatus.SUCCESSFUL
      });

      return tx.serviceTransaction.update({
        where: { id: transaction.id },
        data: { status: TransactionStatus.REFUNDED, responseMessage: "Refunded by admin" }
      });
    });

    return jsonOk({ transaction: transactionPayload(refunded) });
  }

  if (action === "retry") {
    if (!transaction.phoneNumber || !transaction.network || !["DATA", "AIRTIME"].includes(transaction.serviceType)) return jsonError("Transaction is not retryable", 400);
    const response = await vtuService.purchase({
      serviceTransactionId: transaction.id,
      serviceType: transaction.serviceType as "DATA" | "AIRTIME",
      network: transaction.network!,
      amount: Number(transaction.amount),
      providerCode: transaction.plan?.providerCode,
      phoneNumber: transaction.phoneNumber,
      reference: transaction.reference
    });
    const updated = await prisma.serviceTransaction.update({
      where: { id: transaction.id },
      data: {
        status: response.success ? TransactionStatus.SUCCESSFUL : TransactionStatus.FAILED,
        providerReference: response.providerReference,
        responseMessage: response.message
      }
    });
    return jsonOk({ transaction: transactionPayload(updated) });
  }

  if (action === "requery") {
    const metadata = objectValue(transaction.metadata);
    const latestLog = transaction.vtuLogs[0];
    const provider = textValue(metadata.provider || latestLog?.provider).toLowerCase();
    const requestId = textValue(metadata.requestId || transaction.reference);

    if (provider !== "vtpass") return jsonError("Only VTpass transactions can be requeried here", 400);

    const response = await vtuService.requery({
      serviceTransactionId: transaction.id,
      provider,
      requestId
    });

    const updated = await prisma.$transaction(async (tx) => {
      if (response.success) {
        const existingDebit = await tx.walletTransaction.findUnique({ where: { reference: `${transaction.reference}-DEBIT` } });
        if (!existingDebit && transaction.status !== TransactionStatus.SUCCESSFUL) {
          await recordWalletChange({
            tx,
            userId: transaction.userId,
            type: WalletTransactionType.DEBIT,
            amount: transaction.amount,
            reference: `${transaction.reference}-DEBIT`,
            description: `Admin requery debit for ${transaction.reference}`,
            status: TransactionStatus.SUCCESSFUL
          });
        }
      }

      return tx.serviceTransaction.update({
        where: { id: transaction.id },
        data: {
          status: response.success ? TransactionStatus.SUCCESSFUL : TransactionStatus.FAILED,
          providerReference: response.providerReference,
          responseMessage: response.message,
          metadata: {
            ...metadata,
            provider: response.provider,
            requestId: response.requestId,
            transactionId: response.providerReference,
            responseDescription: response.message,
            commission: response.commission ?? null,
            total_amount: response.totalAmount ?? null,
            rawResponse: response.raw ?? null,
            providerStatus: response.success ? "SUCCESSFUL" : "FAILED"
          }
        }
      });
    });

    return jsonOk({ transaction: transactionPayload(updated) });
  }

  return jsonError("Unsupported admin transaction action", 400);
}
