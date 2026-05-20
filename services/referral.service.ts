import { Prisma, TransactionStatus, WalletTransactionType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { recordWalletChange } from "@/lib/wallet";

export async function creditReferralBonus(input: {
  tx: Prisma.TransactionClient;
  referredUserId: string;
  serviceTransactionId: string;
  serviceType: "DATA" | "AIRTIME";
  amount: Prisma.Decimal;
}) {
  const referredUser = await input.tx.user.findUnique({
    where: { id: input.referredUserId },
    select: { referredById: true }
  });
  if (!referredUser?.referredById) return null;

  const existing = await input.tx.referralEarning.findUnique({
    where: {
      beneficiaryUserId_serviceTransactionId: {
        beneficiaryUserId: referredUser.referredById,
        serviceTransactionId: input.serviceTransactionId
      }
    }
  });
  if (existing) return existing;

  const setting =
    (await input.tx.referralCommissionSetting.findFirst({
      where: { OR: [{ serviceType: input.serviceType }, { serviceType: null }], isActive: true },
      orderBy: { serviceType: "desc" }
    })) || null;
  if (!setting) return null;

  const bonus = input.amount.mul(setting.percentage).div(100).plus(setting.flatAmount);
  if (bonus.lessThanOrEqualTo(0)) return null;

  await recordWalletChange({
    tx: input.tx,
    userId: referredUser.referredById,
    type: WalletTransactionType.CREDIT,
    amount: bonus,
    reference: `REF-${input.serviceTransactionId}`,
    description: "Referral commission",
    status: TransactionStatus.SUCCESSFUL
  });

  await input.tx.user.update({
    where: { id: referredUser.referredById },
    data: { referralEarnings: { increment: bonus } }
  });

  return input.tx.referralEarning.create({
    data: {
      beneficiaryUserId: referredUser.referredById,
      referredUserId: input.referredUserId,
      serviceTransactionId: input.serviceTransactionId,
      amount: bonus,
      status: TransactionStatus.SUCCESSFUL
    }
  });
}

export async function referralSummary(userId: string) {
  const [invitedUsers, earnings] = await Promise.all([
    prisma.user.findMany({
      where: { referredById: userId },
      select: { id: true, fullName: true, email: true, createdAt: true },
      orderBy: { createdAt: "desc" }
    }),
    prisma.referralEarning.findMany({
      where: { beneficiaryUserId: userId },
      include: { referredUser: true, serviceTransaction: true },
      orderBy: { createdAt: "desc" }
    })
  ]);

  return { invitedUsers, earnings };
}
