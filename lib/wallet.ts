import { Prisma, TransactionStatus, WalletTransactionType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createReference } from "@/lib/reference";

export async function recordWalletChange(input: {
  tx: Prisma.TransactionClient;
  userId: string;
  type: WalletTransactionType;
  amount: number | Prisma.Decimal;
  description: string;
  reference?: string;
  status?: TransactionStatus;
}) {
  const amount = new Prisma.Decimal(input.amount);
  const user = await input.tx.user.findUnique({
    where: { id: input.userId },
    select: { walletBalance: true }
  });

  if (!user) throw new Error("User not found");

  const balanceBefore = user.walletBalance;
  const balanceAfter =
    input.type === WalletTransactionType.CREDIT ? balanceBefore.plus(amount) : balanceBefore.minus(amount);

  if (balanceAfter.lessThan(0)) {
    throw new Error("Insufficient wallet balance");
  }

  await input.tx.user.update({
    where: { id: input.userId },
    data: { walletBalance: balanceAfter }
  });

  return input.tx.walletTransaction.create({
    data: {
      userId: input.userId,
      type: input.type,
      amount,
      balanceBefore,
      balanceAfter,
      reference: input.reference || createReference(input.type === WalletTransactionType.CREDIT ? "CR" : "DR"),
      status: input.status || TransactionStatus.SUCCESSFUL,
      description: input.description
    }
  });
}

export async function adjustWallet(input: {
  userId: string;
  type: WalletTransactionType;
  amount: number;
  description: string;
  reference?: string;
}) {
  return prisma.$transaction((tx) =>
    recordWalletChange({
      tx,
      userId: input.userId,
      type: input.type,
      amount: input.amount,
      description: input.description,
      reference: input.reference
    })
  );
}
