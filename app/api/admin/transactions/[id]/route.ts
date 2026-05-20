import { NextRequest } from "next/server";
import { TransactionStatus, WalletTransactionType } from "@prisma/client";
import { requireAdmin } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { transactionStatusSchema } from "@/lib/validators";
import { recordWalletChange } from "@/lib/wallet";
import { vtuService } from "@/services/vtu.service";

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const admin = await requireAdmin(request);
  if (!admin) return jsonError("Admin access required", 403);

  const body = transactionStatusSchema.safeParse(await request.json());
  if (!body.success) return jsonError(body.error.errors[0]?.message || "Invalid request", 422);

  const transaction = await prisma.serviceTransaction.update({
    where: { id: params.id },
    data: { status: body.data.status }
  });

  return jsonOk({
    transaction: {
      ...transaction,
      amount: Number(transaction.amount),
      providerCost: Number(transaction.providerCost),
      profit: Number(transaction.profit)
    }
  });
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const admin = await requireAdmin(request);
  if (!admin) return jsonError("Admin access required", 403);

  const action = request.nextUrl.searchParams.get("action");
  const transaction = await prisma.serviceTransaction.findUnique({ where: { id: params.id }, include: { plan: true } });
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

    return jsonOk({ transaction: { ...refunded, amount: Number(refunded.amount) } });
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
    return jsonOk({ transaction: { ...updated, amount: Number(updated.amount) } });
  }

  return jsonError("Unsupported admin transaction action", 400);
}
