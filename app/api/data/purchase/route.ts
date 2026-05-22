import { NextRequest } from "next/server";
import { Prisma, ServiceType, TransactionStatus, WalletTransactionType } from "@prisma/client";
import { requireUser } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/http";
import { detectNetwork, normalizeNigerianPhone } from "@/lib/network-detection";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { createReference } from "@/lib/reference";
import { purchaseDataSchema } from "@/lib/validators";
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
  if (rateLimit(request, "purchase:data", 20, 60_000).limited) return jsonError("Too many purchase attempts", 429);

  const user = await requireUser(request);
  if (!user) return jsonError("Unauthorized", 401);

  const payload = await request.json();
  if (payload && typeof payload === "object" && "phoneNumber" in payload) {
    (payload as { phoneNumber?: unknown }).phoneNumber = normalizeNigerianPhone(String((payload as { phoneNumber?: unknown }).phoneNumber || ""));
  }

  const body = purchaseDataSchema.safeParse(payload);
  if (!body.success) return jsonError(body.error.errors[0]?.message || "Invalid request", 422);
  const normalizedPhone = body.data.phoneNumber;

  const reference = createReference("DATA");

  let created;
  try {
    created = await prisma.$transaction(async (tx) => {
      const plan = await tx.dataPlan.findFirst({ where: { id: body.data.planId, isActive: true } });
      if (!plan) throw new Error("Selected data plan is not available");
      const detectedNetwork = detectNetwork(normalizedPhone);
      if (detectedNetwork && detectedNetwork !== plan.network) {
        throw new Error("This phone number does not match selected network.");
      }

      const freshUser = await tx.user.findUnique({ where: { id: user.id }, select: { walletBalance: true } });
      if (!freshUser || freshUser.walletBalance.lessThan(plan.sellingPrice)) {
        throw new Error("Insufficient wallet balance");
      }

      const duplicate = await tx.serviceTransaction.findFirst({
        where: {
          userId: user.id,
          serviceType: ServiceType.DATA,
          planId: plan.id,
          phoneNumber: normalizedPhone,
          status: TransactionStatus.PENDING,
          createdAt: { gte: new Date(Date.now() - 2 * 60 * 1000) }
        }
      });
      if (duplicate) throw new Error("A similar data purchase is already pending");

      return tx.serviceTransaction.create({
        data: {
          userId: user.id,
          serviceType: ServiceType.DATA,
          network: plan.network,
          phoneNumber: normalizedPhone,
          planId: plan.id,
          amount: plan.sellingPrice,
          providerCost: plan.providerCost,
          profit: plan.sellingPrice.minus(plan.providerCost),
          reference,
          status: TransactionStatus.PENDING,
          responseMessage: "Data purchase created",
          metadata: { providerStatus: "PENDING" }
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
    phoneNumber: normalizedPhone,
    reference,
    maxAmountPayable: Number(created.amount)
  });

  const updated = await prisma.$transaction(async (tx) => {
    if (providerResponse.success) {
      await recordWalletChange({
        tx,
        userId: user.id,
        type: WalletTransactionType.DEBIT,
        amount: new Prisma.Decimal(created.amount),
        reference: `${reference}-DEBIT`,
        description: `Data purchase: ${created.plan?.name || created.reference}`,
        status: TransactionStatus.SUCCESSFUL
      });

      const successful = await tx.serviceTransaction.update({
        where: { id: created.id },
        data: {
          status: TransactionStatus.SUCCESSFUL,
          providerReference: providerResponse.providerReference,
          responseMessage: providerResponse.message,
          metadata: {
            providerStatus: "SUCCESSFUL",
            ...providerMetadata(providerResponse)
          }
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

    const failed = await tx.serviceTransaction.update({
      where: { id: created.id },
      data: {
        status: TransactionStatus.FAILED,
        providerReference: providerResponse.providerReference,
        responseMessage: providerResponse.message,
        metadata: {
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
        message: `Data purchase failed. Your wallet was not debited. Ref: ${failed.reference}`
      }
    });
    return failed;
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
