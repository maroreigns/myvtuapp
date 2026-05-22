import { TransactionStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { easyAccessProvider } from "@/services/vtu/providers/easyaccess.provider";
import { mockVtuProvider } from "@/services/vtu/providers/mock.provider";
import { liveVtuProvider } from "@/services/vtu/providers/live.provider";
import { fetchVtpassDataPlans, vtpassProvider } from "@/services/vtu/providers/vtpass.provider";
import { VtuDataPlan, VtuProvider, VtuPurchaseInput, VtuPurchaseResponse } from "@/services/vtu/types";

const providers: Record<string, VtuProvider> = {
  easyaccess: easyAccessProvider,
  vtpass: vtpassProvider,
  mock: mockVtuProvider,
  live: liveVtuProvider
};

function providerByName(name?: string | null) {
  if (!name) return null;
  return providers[name.toLowerCase()] || null;
}

function configuredProviders(input: VtuPurchaseInput) {
  const legacyMode = process.env.VTU_PROVIDER_MODE;
  const primaryName = process.env.VTU_PROVIDER_PRIMARY || legacyMode || "mock";
  const fallbackName = process.env.VTU_PROVIDER_FALLBACK || (primaryName === "easyaccess" ? "mock" : "easyaccess");
  const selected = [providerByName(primaryName), providerByName(fallbackName)]
    .filter((item): item is VtuProvider => Boolean(item))
    .filter((item, index, list) => list.findIndex((candidate) => candidate.name === item.name) === index)
    .filter((item) => !item.supports || item.supports(input));

  return selected.length > 0 ? selected : [mockVtuProvider];
}

function requestPayload(input: VtuPurchaseInput) {
  return {
    serviceType: input.serviceType,
    network: input.network,
    phoneNumber: input.phoneNumber,
    amount: input.amount,
    reference: input.reference,
    providerCode: input.providerCode
  };
}

async function logProviderAttempt(input: VtuPurchaseInput & { serviceTransactionId?: string }, provider: VtuProvider, response: VtuPurchaseResponse, error?: string) {
  await prisma.vtuApiLog.create({
    data: {
      serviceTransactionId: input.serviceTransactionId,
      provider: provider.name,
      serviceType: input.serviceType,
      requestPayload: requestPayload(input),
      responsePayload: response.raw === undefined ? response : (response.raw as object),
      status: response.success ? TransactionStatus.SUCCESSFUL : TransactionStatus.FAILED,
      error: error || (response.success ? null : response.message)
    }
  });
}

function failedResponse(provider: VtuProvider, input: VtuPurchaseInput, message: string): VtuPurchaseResponse {
  return {
    success: false,
    provider: provider.name,
    requestId: input.reference,
    providerReference: `${provider.name.toUpperCase()}-${input.reference}`,
    message
  };
}

export const vtuService = {
  async purchase(input: VtuPurchaseInput & { serviceTransactionId?: string }) {
    let lastResponse: VtuPurchaseResponse | null = null;

    for (const selectedProvider of configuredProviders(input)) {
      try {
        const response = await selectedProvider.purchase(input);
        await logProviderAttempt(input, selectedProvider, response);
        lastResponse = response;
        if (response.success) return response;
      } catch (error) {
        const message = error instanceof Error ? error.message : "VTU provider request failed";
        const response = failedResponse(selectedProvider, input, message);
        await logProviderAttempt(input, selectedProvider, response, message);
        lastResponse = response;
      }
    }

    return lastResponse || failedResponse(mockVtuProvider, input, "No VTU provider is available for this request");
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
    const plans = await fetchVtpassDataPlans(network);
    if (plans.length === 0) return { synced: 0, providerCodes: [] };

    await upsertPlans(plans);

    return { synced: plans.length, providerCodes: plans.map((plan) => plan.providerCode) };
  },

  async requery(input: { serviceTransactionId: string; provider: string; requestId: string }) {
    const selectedProvider = providerByName(input.provider);
    if (!selectedProvider?.requery) {
      return failedResponse(selectedProvider || mockVtuProvider, {
        serviceType: "AIRTIME",
        network: "MTN",
        phoneNumber: "",
        amount: 0,
        reference: input.requestId
      }, "Selected VTU provider does not support requery");
    }

    try {
      const response = await selectedProvider.requery(input.requestId);
      await prisma.vtuApiLog.create({
        data: {
          serviceTransactionId: input.serviceTransactionId,
          provider: selectedProvider.name,
          serviceType: "AIRTIME",
          requestPayload: { request_id: input.requestId, action: "requery" },
          responsePayload: response.raw === undefined ? response : (response.raw as object),
          status: response.success ? TransactionStatus.SUCCESSFUL : TransactionStatus.FAILED,
          error: response.success ? null : response.message
        }
      });
      return response;
    } catch (error) {
      const message = error instanceof Error ? error.message : "VTU requery failed";
      const response = failedResponse(selectedProvider, {
        serviceType: "AIRTIME",
        network: "MTN",
        phoneNumber: "",
        amount: 0,
        reference: input.requestId
      }, message);
      await prisma.vtuApiLog.create({
        data: {
          serviceTransactionId: input.serviceTransactionId,
          provider: selectedProvider.name,
          serviceType: "AIRTIME",
          requestPayload: { request_id: input.requestId, action: "requery" },
          status: TransactionStatus.FAILED,
          error: message
        }
      });
      return response;
    }
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
