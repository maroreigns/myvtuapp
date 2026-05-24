import { TransactionStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { fetchVtpassDataPlans, vtpassProvider } from "@/services/vtu/providers/vtpass.provider";
import { VtuDataPlan, VtuProvider, VtuPurchaseInput, VtuPurchaseResponse } from "@/services/vtu/types";

const providers: Record<string, VtuProvider> = {
  vtpass: vtpassProvider
};

function providerByName(name?: string | null) {
  if (!name) return null;
  return providers[name.toLowerCase()] || null;
}

function configuredProvider(input: VtuPurchaseInput) {
  const primaryName = (process.env.VTU_PROVIDER_PRIMARY || "vtpass").toLowerCase();
  const fallbackName = process.env.VTU_PROVIDER_FALLBACK || null;

  if (primaryName !== "vtpass") {
    console.warn("[vtu] unsupported provider ignored", {
      configuredPrimary: primaryName,
      providerSelected: "vtpass",
      fallbackEnabled: false
    });
  }

  if (fallbackName) {
    console.info("[vtu] fallback provider ignored", {
      configuredFallback: fallbackName,
      providerSelected: "vtpass",
      fallbackEnabled: false
    });
  }

  console.info("[vtu] provider selected", {
    provider: "vtpass",
    fallbackEnabled: false,
    serviceType: input.serviceType,
    reference: input.reference
  });

  if (vtpassProvider.supports && !vtpassProvider.supports(input)) return null;
  return vtpassProvider;
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
    const selectedProvider = configuredProvider(input);
    if (!selectedProvider) {
      const response = failedResponse(vtpassProvider, input, "VTpass does not support this request");
      await logProviderAttempt(input, vtpassProvider, response, response.message);
      return response;
    }

    try {
      const response = await selectedProvider.purchase(input);
      await logProviderAttempt(input, selectedProvider, response);
      return response;
    } catch (error) {
      const message = error instanceof Error ? error.message : "VTpass provider request failed";
      const response = failedResponse(selectedProvider, input, message);
      await logProviderAttempt(input, selectedProvider, response, message);
      return response;
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
    const plans = await fetchVtpassDataPlans(network);
    if (plans.length === 0) return { synced: 0, providerCodes: [], plans: [], cacheError: null };

    let cacheError: string | null = null;
    try {
      await upsertPlans(plans);
    } catch (error) {
      cacheError = error instanceof Error ? error.message : "Data plans could not be cached";
      console.error("[data-plans] VTpass plans fetched but cache save failed", { reason: cacheError });
    }

    return {
      synced: plans.length,
      providerCodes: plans.map((plan) => plan.providerCode),
      plans,
      cacheError
    };
  },

  async requery(input: { serviceTransactionId: string; provider: string; requestId: string }) {
    const selectedProvider = providerByName("vtpass");
    if (!selectedProvider?.requery) {
      return failedResponse(vtpassProvider, {
        serviceType: "AIRTIME",
        network: "MTN",
        phoneNumber: "",
        amount: 0,
        reference: input.requestId
      }, "VTpass provider does not support requery");
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
