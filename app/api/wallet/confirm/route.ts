import { NextRequest } from "next/server";
import { PaymentGateway, TransactionStatus, WalletTransactionType } from "@prisma/client";
import { requireUser } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { confirmPaymentSchema } from "@/lib/validators";
import { recordWalletChange } from "@/lib/wallet";
import { flutterwaveService } from "@/services/flutterwave.service";
import { paystackService } from "@/services/paystack.service";

export async function POST(request: NextRequest) {
  const user = await requireUser(request);
  if (!user) return jsonError("Unauthorized", 401);

  const body = confirmPaymentSchema.safeParse(await request.json());
  if (!body.success) return jsonError(body.error.errors[0]?.message || "Invalid request", 422);

  const payment = await prisma.payment.findUnique({ where: { reference: body.data.reference } });
  if (!payment || payment.userId !== user.id) return jsonError("Payment not found", 404);
  if (payment.status === TransactionStatus.SUCCESSFUL) return jsonError("Payment reference has already been processed", 409);

  const verification =
    payment.gateway === PaymentGateway.PAYSTACK
      ? await paystackService.verifyPayment(payment.reference)
      : await flutterwaveService.verifyPayment(payment.reference);

  if (!["success", "successful"].includes(verification.status)) {
    await prisma.payment.update({ where: { id: payment.id }, data: { status: TransactionStatus.FAILED } });
    return jsonError("Payment verification failed", 400);
  }

  const walletTransaction = await prisma.$transaction(async (tx) => {
    const lockedPayment = await tx.payment.findUnique({ where: { id: payment.id } });
    if (!lockedPayment || lockedPayment.status === TransactionStatus.SUCCESSFUL) {
      throw new Error("Payment reference has already been processed");
    }

    await tx.payment.update({ where: { id: payment.id }, data: { status: TransactionStatus.SUCCESSFUL } });
    return recordWalletChange({
      tx,
      userId: user.id,
      type: WalletTransactionType.CREDIT,
      amount: payment.amount,
      reference: `${payment.reference}-WALLET`,
      description: `Wallet funding via ${payment.gateway}`,
      status: TransactionStatus.SUCCESSFUL
    });
  });

  return jsonOk({ walletTransaction: { ...walletTransaction, amount: Number(walletTransaction.amount) } });
}
