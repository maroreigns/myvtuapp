import { Payment, TransactionStatus, WalletTransactionType } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { recordWalletChange } from "@/lib/wallet";

export async function markPaymentSuccessful(input: {
  payment: Payment;
  amount?: number;
  gatewayReference?: string;
  paidAt?: string | null;
}) {
  return prisma.$transaction(async (tx) => {
    const lockedPayment = await tx.payment.findUnique({ where: { id: input.payment.id }, include: { user: true } });
    if (!lockedPayment) throw new Error("Payment not found");
    if (lockedPayment.status === TransactionStatus.SUCCESSFUL) return null;

    const expectedAmount = new Prisma.Decimal(lockedPayment.amount);
    if (input.amount !== undefined && new Prisma.Decimal(input.amount).lessThan(expectedAmount)) {
      await tx.payment.update({
        where: { id: lockedPayment.id },
        data: { status: TransactionStatus.FAILED, failureReason: "Paid amount is lower than expected" }
      });
      throw new Error("Paid amount is lower than expected");
    }

    await tx.payment.update({
      where: { id: lockedPayment.id },
      data: {
        status: TransactionStatus.SUCCESSFUL,
        gatewayReference: input.gatewayReference,
        paidAt: input.paidAt ? new Date(input.paidAt) : new Date()
      }
    });

    const walletTransaction = await recordWalletChange({
      tx,
      userId: lockedPayment.userId,
      type: WalletTransactionType.CREDIT,
      amount: lockedPayment.amount,
      reference: `${lockedPayment.reference}-WALLET`,
      description: `Wallet funding via ${lockedPayment.gateway}`,
      status: TransactionStatus.SUCCESSFUL
    });

    await tx.smsLog.create({
      data: {
        userId: lockedPayment.userId,
        phone: lockedPayment.user.phone,
        provider: process.env.SMS_PROVIDER || "mock",
        status: "SENT",
        message: `Wallet funded successfully with NGN ${Number(lockedPayment.amount).toLocaleString()}. Ref: ${lockedPayment.reference}`
      }
    });

    return walletTransaction;
  });
}
