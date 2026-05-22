import { TransactionStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { easyAccessProvider, fetchEasyAccessDataPlans } from "@/services/vtu/providers/easyaccess.provider";
import { mockVtuProvider } from "@/services/vtu/providers/mock.provider";
import { liveVtuProvider } from "@/services/vtu/providers/live.provider";
import { VtuDataPlan, VtuPurchaseInput } from "@/services/vtu/types";

function provider() {
  if (process.env.VTU_PROVIDER_MODE === "easyaccess" || process.env.VTU_PROVIDER_MODE === "live") return easyAccessProvider;
  return process.env.VTU_PROVIDER_MODE === "live" ? liveVtuProvider : mockVtuProvider;
}

export const vtuService = {
  async purchase(input: VtuPurchaseInput & { serviceTransactionId?: string }) {
    const selectedProvider = provider();
    const requestPayload = {
      serviceType: input.serviceType,
      network: input.network,
      phoneNumber: input.phoneNumber,
      amount: input.amount,
      reference: input.reference,
      providerCode: input.providerCode
    };

    try {
      const response = await selectedProvider.purchase(input);
      await prisma.vtuApiLog.create({
        data: {
          serviceTransactionId: input.serviceTransactionId,
          provider: selectedProvider.name,
          serviceType: input.serviceType,
          requestPayload,
          responsePayload: response.raw === undefined ? response : (response.raw as object),
          status: response.success ? TransactionStatus.SUCCESSFUL : TransactionStatus.FAILED,
          error: response.success ? null : response.message
        }
      });
      return response;
    } catch (error) {
      const message = error instanceof Error ? error.message : "VTU provider request failed";
      await prisma.vtuApiLog.create({
        data: {
          serviceTransactionId: input.serviceTransactionId,
          provider: selectedProvider.name,
          serviceType: input.serviceType,
          requestPayload,
          status: TransactionStatus.FAILED,
          error: message
        }
      });
      return {
        success: false,
        providerReference: `${selectedProvider.name.toUpperCase()}-${input.reference}`,
        message
      };
    }
  },

  async buyData(input: { providerCode: string; phoneNumber: string; reference: string }) {
    return this.purchase({
      serviceType: "DATA",
      network: "MTN",
      amount: 0,
      providerCode: input.providerCode,
      phoneNumber: input.phoneNumber,
      reference: input.reference
    });
  },

  async syncDataPlans(network?: string) {
    const plans = await fetchEasyAccessDataPlans(network);
    if (plans.length === 0) return { synced: 0, providerCodes: [] };

    await upsertPlans(plans);

    return { synced: plans.length, providerCodes: plans.map((plan) => plan.providerCode) };
  }
};

async function upsertPlans(plans: VtuDataPlan[]) {
  await prisma.$transaction(
    plans.map((plan) =>
      prisma.dataPlan.upsert({
        where: { providerCode: plan.providerCode },
        create: {
          network: plan.network,
          name: plan.name,
          dataSize: plan.dataSize,
          validity: plan.validity,
          providerCode: plan.providerCode,
          providerCost: plan.providerCost,
          sellingPrice: plan.sellingPrice,
          isActive: true
        },
        update: {
          network: plan.network,
          name: plan.name,
          dataSize: plan.dataSize,
          validity: plan.validity,
          providerCost: plan.providerCost,
          sellingPrice: plan.sellingPrice,
          isActive: true
        }
      })
    )
  );
}
