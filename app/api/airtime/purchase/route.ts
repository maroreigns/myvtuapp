import { NextRequest } from "next/server";
import { Prisma, ServiceType, TransactionStatus, WalletTransactionType } from "@prisma/client";
import { requireUser } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { createReference } from "@/lib/reference";
import { purchaseAirtimeSchema } from "@/lib/validators";
import { recordWalletChange } from "@/lib/wallet";
import { vtuService } from "@/services/vtu.service";
import { creditReferralBonus } from "@/services/referral.service";

export async function POST(request: NextRequest) {
  if (rateLimit(request, "purchase:airtime", 20, 60_000).limited) return jsonError("Too many purchase attempts", 429);

  const user = await requireUser(request);
  if (!user) return jsonError("Unauthorized", 401);
  if (!user.emailVerifiedAt) return jsonError("Please verify your email before buying airtime", 403);

  const body = purchaseAirtimeSchema.safeParse(await request.json());
  if (!body.success) return jsonError(body.error.errors[0]?.message || "Invalid request", 422);

  const reference = createReference("AIR");
  const amount = new Prisma.Decimal(body.data.amount);

  let created;
  try {
    created = await prisma.$transaction(async (tx) => {
      const pricing = await tx.airtimePricing.findUnique({ where: { network: body.data.network } });
      if (pricing && !pricing.isActive) throw new Error("Airtime is not active for this network");

      const discountPercent = pricing?.discountPercent || new Prisma.Decimal(0);
      const providerCostPercent = pricing?.providerCostPercent || new Prisma.Decimal(98);
      const sellingPrice = amount.minus(amount.mul(discountPercent).div(100));
      const providerCost = amount.mul(providerCostPercent).div(100);

      await recordWalletChange({
        tx,
        userId: user.id,
        type: WalletTransactionType.DEBIT,
        amount: sellingPrice,
        reference: `${reference}-DEBIT`,
        description: `Airtime purchase: ${body.data.network}`,
        status: TransactionStatus.SUCCESSFUL
      });

      return tx.serviceTransaction.create({
        data: {
          userId: user.id,
          serviceType: ServiceType.AIRTIME,
          network: body.data.network,
          phoneNumber: body.data.phoneNumber,
          amount: sellingPrice,
          providerCost,
          profit: sellingPrice.minus(providerCost),
          reference,
          status: TransactionStatus.PENDING,
          responseMessage: "Airtime purchase created and wallet debited",
          metadata: { faceValue: body.data.amount }
        }
      });
    });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Airtime purchase could not be created", 400);
  }

  const providerResponse = await vtuService.purchase({
    serviceTransactionId: created.id,
    serviceType: ServiceType.AIRTIME,
    network: body.data.network,
    amount: body.data.amount,
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
        serviceType: ServiceType.AIRTIME,
        amount: new Prisma.Decimal(successful.amount)
      });
      await tx.smsLog.create({
        data: {
          userId: user.id,
          phone: user.phone,
          provider: process.env.SMS_PROVIDER || "mock",
          status: "SENT",
          message: `Airtime purchase successful. Ref: ${successful.reference}`
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
        message: `Airtime purchase failed and wallet was refunded. Ref: ${refunded.reference}`
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
