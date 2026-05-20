import { NextRequest } from "next/server";
import { Prisma, ServiceType, TransactionStatus, WalletTransactionType } from "@prisma/client";
import { requireUser } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { createReference } from "@/lib/reference";
import { purchaseDataSchema } from "@/lib/validators";
import { recordWalletChange } from "@/lib/wallet";
import { vtuService } from "@/services/vtu.service";
import { creditReferralBonus } from "@/services/referral.service";

export async function POST(request: NextRequest) {
  if (rateLimit(request, "purchase:data", 20, 60_000).limited) return jsonError("Too many purchase attempts", 429);

  const user = await requireUser(request);
  if (!user) return jsonError("Unauthorized", 401);
  if (!user.emailVerifiedAt) return jsonError("Please verify your email before buying data", 403);

  const body = purchaseDataSchema.safeParse(await request.json());
  if (!body.success) return jsonError(body.error.errors[0]?.message || "Invalid request", 422);

  const reference = createReference("DATA");

  let created;
  try {
    created = await prisma.$transaction(async (tx) => {
      const plan = await tx.dataPlan.findFirst({ where: { id: body.data.planId, isActive: true } });
      if (!plan) throw new Error("Selected data plan is not available");

      const freshUser = await tx.user.findUnique({ where: { id: user.id }, select: { walletBalance: true } });
      if (!freshUser || freshUser.walletBalance.lessThan(plan.sellingPrice)) {
        throw new Error("Insufficient wallet balance");
      }

      await recordWalletChange({
        tx,
        userId: user.id,
        type: WalletTransactionType.DEBIT,
        amount: plan.sellingPrice,
        reference: `${reference}-DEBIT`,
        description: `Data purchase: ${plan.name}`,
        status: TransactionStatus.SUCCESSFUL
      });

      return tx.serviceTransaction.create({
        data: {
          userId: user.id,
          serviceType: ServiceType.DATA,
          network: plan.network,
          phoneNumber: body.data.phoneNumber,
          planId: plan.id,
          amount: plan.sellingPrice,
          providerCost: plan.providerCost,
          profit: plan.sellingPrice.minus(plan.providerCost),
          reference,
          status: TransactionStatus.PENDING,
          responseMessage: "Purchase created and wallet debited"
        },
        include: { plan: true }
      });
    });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Purchase could not be created", 400);
  }

  const providerResponse = await vtuService.purchase({
    serviceTransactionId: created.id,
    serviceType: ServiceType.DATA,
    network: created.network!,
    amount: Number(created.amount),
    providerCode: created.plan?.providerCode || "",
    phoneNumber: body.data.phoneNumber,
    reference
  });

  const updated = await prisma.$transaction(async (tx) => {
    if (providerResponse.success) {
      const successful = await tx.serviceTransaction.update({
        where: { id: created.id },
        data: {
          status: TransactionStatus.SUCCESSFUL,
          providerReference: providerResponse.providerReference,
          responseMessage: providerResponse.message
        }
      });
      await creditReferralBonus({
        tx,
        referredUserId: user.id,
        serviceTransactionId: successful.id,
        serviceType: ServiceType.DATA,
        amount: new Prisma.Decimal(successful.amount)
      });
      await tx.smsLog.create({
        data: {
          userId: user.id,
          phone: user.phone,
          provider: process.env.SMS_PROVIDER || "mock",
          status: "SENT",
          message: `Data purchase successful. Ref: ${successful.reference}`
        }
      });
      return successful;
    }

    await recordWalletChange({
      tx,
      userId: user.id,
      type: WalletTransactionType.CREDIT,
      amount: new Prisma.Decimal(created.amount),
      reference: `${reference}-REFUND`,
      description: `Automatic refund for failed ${created.reference}`,
      status: TransactionStatus.SUCCESSFUL
    });

    const refunded = await tx.serviceTransaction.update({
      where: { id: created.id },
      data: {
        status: TransactionStatus.REFUNDED,
        providerReference: providerResponse.providerReference,
        responseMessage: providerResponse.message
      }
    });
    await tx.smsLog.create({
      data: {
        userId: user.id,
        phone: user.phone,
        provider: process.env.SMS_PROVIDER || "mock",
        status: "SENT",
        message: `Data purchase failed and wallet was refunded. Ref: ${refunded.reference}`
      }
    });
    return refunded;
  });

  return jsonOk({
    transaction: {
      ...updated,
      amount: Number(updated.amount),
      providerCost: Number(updated.providerCost),
      profit: Number(updated.profit)
    }
  });
}
