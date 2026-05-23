import { Payment, TransactionStatus, WalletTransactionType } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

function paymentWalletReference(reference: string) {
  return `${reference}-WALLET`;
}

function rawResponseValue(value: Prisma.InputJsonValue | null | undefined) {
  if (value === undefined) return undefined;
  return value === null ? Prisma.JsonNull : value;
}

async function findWalletCredit(reference: string) {
  return prisma.walletTransaction.findUnique({ where: { reference: paymentWalletReference(reference) } });
}

async function createWalletFundingCredit(input: {
  payment: Payment;
  walletReference: string;
}) {
  const amount = new Prisma.Decimal(input.payment.amount);
  const updatedUser = await prisma.user.update({
    where: { id: input.payment.userId },
    data: { walletBalance: { increment: amount } },
    select: { walletBalance: true }
  });
  const balanceAfter = updatedUser.walletBalance;
  const balanceBefore = balanceAfter.minus(amount);

  try {
    return await prisma.walletTransaction.create({
      data: {
        userId: input.payment.userId,
        type: WalletTransactionType.CREDIT,
        amount,
        balanceBefore,
        balanceAfter,
        reference: input.walletReference,
        description: `Wallet funding via ${input.payment.gateway}`,
        status: TransactionStatus.SUCCESSFUL
      }
    });
  } catch (error) {
    try {
      await prisma.user.update({
        where: { id: input.payment.userId },
        data: { walletBalance: { decrement: amount } }
      });
    } catch (rollbackError) {
      console.error("[wallet:verify] wallet credit rollback failed", {
        reference: input.payment.reference,
        message: rollbackError instanceof Error ? rollbackError.message : "Unknown rollback error"
      });
    }

    throw error;
  }
}

export async function markPaymentSuccessful(input: {
  payment: Payment;
  amount?: number;
  amountKobo?: number;
  gatewayReference?: string;
  paidAt?: string | null;
  rawResponse?: Prisma.InputJsonValue | null;
}) {
  const payment = await prisma.payment.findUnique({ where: { id: input.payment.id } });
  if (!payment) throw new Error("Payment not found");

  const walletReference = paymentWalletReference(payment.reference);
  if (payment.status === TransactionStatus.SUCCESSFUL) return findWalletCredit(payment.reference);
  if (payment.status !== TransactionStatus.PENDING) throw new Error("Payment is not pending");

  const expectedAmount = new Prisma.Decimal(payment.amount);
  const expectedKobo = expectedAmount.mul(100).toDecimalPlaces(0);
  const amountKoboMatches = input.amountKobo === undefined || new Prisma.Decimal(input.amountKobo).equals(expectedKobo);
  const amountMatches = input.amount === undefined || new Prisma.Decimal(input.amount).equals(expectedAmount);

  if (!amountKoboMatches || !amountMatches) {
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: TransactionStatus.FAILED,
        failureReason: "Paid amount does not match expected amount",
        rawResponse: rawResponseValue(input.rawResponse)
      }
    });
    throw new Error("Paid amount does not match expected amount");
  }

  await prisma.payment.updateMany({
    where: { id: payment.id, status: TransactionStatus.PENDING },
    data: {
      gatewayReference: input.gatewayReference,
      paidAt: input.paidAt ? new Date(input.paidAt) : new Date(),
      failureReason: null,
      rawResponse: rawResponseValue(input.rawResponse)
    }
  });

  const existingWalletCredit = await findWalletCredit(payment.reference);
  if (existingWalletCredit) {
    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: TransactionStatus.SUCCESSFUL, failureReason: null }
    });
    return existingWalletCredit;
  }

  const walletTransaction = await createWalletFundingCredit({ payment, walletReference });
  await prisma.payment.update({
    where: { id: payment.id },
    data: { status: TransactionStatus.SUCCESSFUL, failureReason: null }
  });

  return walletTransaction;
}

export async function finalizePaystackWalletFunding(input: {
  reference: string;
  userId?: string;
  status: string;
  amountKobo: number;
  gatewayReference?: string;
  paidAt?: string | null;
  message?: string;
  rawResponse?: Prisma.InputJsonValue | null;
  verified?: boolean;
}) {
  const payment = await prisma.payment.findUnique({
    where: { reference: input.reference }
  });

  if (!payment) {
    console.info("[wallet:verify] matched payment", {
      reference: input.reference,
      paymentFound: false,
      paystackStatus: input.status,
      amountMatch: false
    });
    throw new Error("Payment reference was not found");
  }
  if (input.userId && payment.userId !== input.userId) throw new Error("Payment reference was not found");
  if (payment.gateway !== "PAYSTACK") throw new Error("Payment provider is not valid");

  const walletReference = paymentWalletReference(payment.reference);
  const expectedKobo = new Prisma.Decimal(payment.amount).mul(100).toDecimalPlaces(0);
  const amountMatches = new Prisma.Decimal(input.amountKobo || 0).equals(expectedKobo);
  console.info("[wallet:verify] matched payment", {
    reference: input.reference,
    paymentFound: true,
    paymentStatus: payment.status,
    paystackStatus: input.status,
    amountMatch: amountMatches
  });

  if (payment.status === TransactionStatus.SUCCESSFUL) {
    const existingCredit = await findWalletCredit(payment.reference);
    return { payment, walletTransaction: existingCredit, alreadyProcessed: true };
  }
  if (payment.status !== TransactionStatus.PENDING) {
    return { payment, walletTransaction: null, alreadyProcessed: false, failed: true };
  }

  const isSuccessful = input.status === "success";
  const isConfirmedFailed = input.verified !== false && ["failed", "abandoned", "reversed"].includes(input.status);
  const referenceMatches = input.reference === payment.reference;
  const shouldMarkFailed = isConfirmedFailed || (isSuccessful && (!amountMatches || !referenceMatches));

  if (!isSuccessful || !amountMatches || !referenceMatches) {
    if (shouldMarkFailed) {
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: TransactionStatus.FAILED,
          failureReason:
            isSuccessful && !amountMatches
              ? "Paid amount does not match expected amount"
              : input.message || "Paystack payment verification failed",
          gatewayReference: input.gatewayReference,
          rawResponse: rawResponseValue(input.rawResponse)
        }
      });
      return { payment, walletTransaction: null, alreadyProcessed: false, failed: true };
    }

    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        gatewayReference: input.gatewayReference,
        rawResponse: rawResponseValue(input.rawResponse)
      }
    });
    return { payment, walletTransaction: null, alreadyProcessed: false, pending: true };
  }

  await prisma.payment.updateMany({
    where: { id: payment.id, status: TransactionStatus.PENDING },
    data: {
      gatewayReference: input.gatewayReference,
      paidAt: input.paidAt ? new Date(input.paidAt) : new Date(),
      failureReason: null,
      rawResponse: rawResponseValue(input.rawResponse)
    }
  });

  const existingCredit = await findWalletCredit(payment.reference);
  if (existingCredit) {
    const updatedPayment = await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: TransactionStatus.SUCCESSFUL,
        gatewayReference: input.gatewayReference,
        paidAt: input.paidAt ? new Date(input.paidAt) : payment.paidAt,
        failureReason: null,
        rawResponse: rawResponseValue(input.rawResponse)
      }
    });
    return { payment: updatedPayment, walletTransaction: existingCredit, alreadyProcessed: true };
  }

  const walletTransaction = await createWalletFundingCredit({ payment, walletReference });
  const updatedPayment = await prisma.payment.update({
    where: { id: payment.id },
    data: {
      status: TransactionStatus.SUCCESSFUL,
      gatewayReference: input.gatewayReference,
      paidAt: input.paidAt ? new Date(input.paidAt) : new Date(),
      failureReason: null,
      rawResponse: rawResponseValue(input.rawResponse)
    }
  });

  return { payment: updatedPayment, walletTransaction, alreadyProcessed: false };
}

export async function markPaymentFailed(input: {
  paymentId: string;
  failureReason: string;
  gatewayReference?: string;
  rawResponse?: Prisma.InputJsonValue | null;
}) {
  return prisma.payment.update({
    where: { id: input.paymentId },
    data: {
      status: TransactionStatus.FAILED,
      failureReason: input.failureReason,
      gatewayReference: input.gatewayReference,
      rawResponse: rawResponseValue(input.rawResponse)
    }
  });
}

export async function markPaymentInitialization(input: {
  paymentId: string;
  gatewayReference?: string;
  rawResponse?: Prisma.InputJsonValue | null;
}) {
  return prisma.payment.update({
    where: { id: input.paymentId },
    data: {
      gatewayReference: input.gatewayReference,
      rawResponse: rawResponseValue(input.rawResponse)
    }
  });
}
