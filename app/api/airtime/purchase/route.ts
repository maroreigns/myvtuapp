import { NextRequest } from "next/server";
import { Prisma, ServiceType, TransactionStatus, WalletTransactionType } from "@prisma/client";
import { requireUser } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/http";
import { detectNetwork, normalizeNigerianPhone } from "@/lib/network-detection";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { createReference } from "@/lib/reference";
import { purchaseAirtimeSchema } from "@/lib/validators";
import { recordWalletChange } from "@/lib/wallet";
import { vtuService } from "@/services/vtu.service";
import { creditReferralBonus } from "@/services/referral.service";

function providerMetadata(response: Awaited<ReturnType<typeof vtuService.purchase>>) {
  return {
    provider: response.provider,
    requestId: response.requestId,
    transactionId: response.providerReference,
    responseDescription: response.message,
    commission: response.commission ?? null,
    total_amount: response.totalAmount ?? null,
    rawResponse: response.raw ?? null
  };
}

export async function POST(request: NextRequest) {
  if (rateLimit(request, "purchase:airtime", 20, 60_000).limited) return jsonError("Too many purchase attempts", 429);

  const user = await requireUser(request);
  if (!user) return jsonError("Unauthorized", 401);

  const payload = await request.json();
  if (payload && typeof payload === "object" && "phoneNumber" in payload) {
    (payload as { phoneNumber?: unknown }).phoneNumber = normalizeNigerianPhone(String((payload as { phoneNumber?: unknown }).phoneNumber || ""));
  }

  const body = purchaseAirtimeSchema.safeParse(payload);
  if (!body.success) return jsonError(body.error.errors[0]?.message || "Invalid request", 422);
  const normalizedPhone = body.data.phoneNumber;
  const detectedNetwork = detectNetwork(normalizedPhone);
  if (detectedNetwork && detectedNetwork !== body.data.network) {
    return jsonError("This phone number does not match selected network.", 400);
  }

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

      const freshUser = await tx.user.findUnique({ where: { id: user.id }, select: { walletBalance: true } });
      if (!freshUser || freshUser.walletBalance.lessThan(sellingPrice)) {
        throw new Error("Insufficient wallet balance");
      }

      const duplicate = await tx.serviceTransaction.findFirst({
        where: {
          userId: user.id,
          serviceType: ServiceType.AIRTIME,
          network: body.data.network,
          phoneNumber: normalizedPhone,
          amount: sellingPrice,
          status: TransactionStatus.PENDING,
          createdAt: { gte: new Date(Date.now() - 2 * 60 * 1000) }
        }
      });
      if (duplicate) throw new Error("A similar airtime purchase is already pending");

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
          responseMessage: "Airtime purchase created",
          metadata: { faceValue: body.data.amount, providerStatus: "PENDING" }
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
    phoneNumber: normalizedPhone,
    reference
  });

  const updated = await prisma.$transaction(async (tx) => {
    if (providerResponse.success) {
      await recordWalletChange({
        tx,
        userId: user.id,
        type: WalletTransactionType.DEBIT,
        amount: new Prisma.Decimal(created.amount),
        reference: `${reference}-DEBIT`,
        description: `Airtime purchase: ${body.data.network}`,
        status: TransactionStatus.SUCCESSFUL
      });

      const successful = await tx.serviceTransaction.update({
        where: { id: created.id },
        data: {
          status: TransactionStatus.SUCCESSFUL,
          providerReference: providerResponse.providerReference,
          responseMessage: providerResponse.message,
          metadata: {
            faceValue: body.data.amount,
            providerStatus: "SUCCESSFUL",
            ...providerMetadata(providerResponse)
          }
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

    const failed = await tx.serviceTransaction.update({
      where: { id: created.id },
      data: {
        status: TransactionStatus.FAILED,
        providerReference: providerResponse.providerReference,
        responseMessage: providerResponse.message,
        metadata: {
          faceValue: body.data.amount,
          providerStatus: "FAILED",
          ...providerMetadata(providerResponse)
        }
      }
    });
    await tx.smsLog.create({
      data: {
        userId: user.id,
        phone: user.phone,
        provider: process.env.SMS_PROVIDER || "mock",
        status: "SENT",
        message: `Airtime purchase failed. Your wallet was not debited. Ref: ${failed.reference}`
      }
    });
    return failed;
  });

  return jsonOk({
    success: updated.status === TransactionStatus.SUCCESSFUL,
    amount: Number(updated.amount),
    reference: updated.reference,
    serviceType: "AIRTIME",
    message: updated.status === TransactionStatus.SUCCESSFUL ? "Airtime purchase successful" : updated.responseMessage || "Airtime purchase failed",
    transaction: {
      ...updated,
      amount: Number(updated.amount),
      providerCost: Number(updated.providerCost),
      profit: Number(updated.profit)
    }
  });
}
