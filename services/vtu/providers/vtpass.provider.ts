import { Network, ServiceType } from "@prisma/client";
import { VtuDataPlan, VtuProvider, VtuPurchaseInput, VtuPurchaseResponse } from "@/services/vtu/types";

const VTPASS_TIMEOUT_MS = 15_000;
const VTPASS_PLAN_TIMEOUT_MS = 8_000;

type VtpassFetchContext = {
  endpoint: string;
  selectedNetwork?: string | null;
  serviceID?: string;
  status?: number;
  responseKeys?: string[];
};

export class VtpassDataPlanError extends Error {
  context: VtpassFetchContext;

  constructor(message: string, context: VtpassFetchContext) {
    super(message);
    this.name = "VtpassDataPlanError";
    this.context = context;
  }
}

const airtimeServiceIds: Record<Network, string> = {
  MTN: "mtn",
  AIRTEL: "airtel",
  GLO: "glo",
  NINE_MOBILE: "etisalat"
};

const dataServiceIds: Record<Network, string[]> = {
  MTN: ["mtn-data"],
  AIRTEL: ["airtel-data"],
  GLO: ["glo-data", "glo-sme-data"],
  NINE_MOBILE: ["etisalat-data"]
};

const serviceIdNetworks: Record<string, Network> = {
  "mtn-data": "MTN",
  "airtel-data": "AIRTEL",
  "glo-data": "GLO",
  "glo-sme-data": "GLO",
  "etisalat-data": "NINE_MOBILE"
};

function configuredBaseUrl() {
  const mode = (process.env.VTPASS_MODE || "sandbox").toLowerCase();
  const fallback = mode === "live" ? "https://vtpass.com" : "https://sandbox.vtpass.com";
  return (process.env.VTPASS_BASE_URL || fallback).replace(/\/$/, "");
}

function authHeaders() {
  const apiKey = process.env.VTPASS_API_KEY;
  const secretKey = process.env.VTPASS_SECRET_KEY;
  if (!apiKey || !secretKey) throw new Error("VTpass API key and secret key are not configured");

  // VTpass docs: POST requests authenticate with api-key and secret-key headers.
  return {
    "Content-Type": "application/json",
    "api-key": apiKey,
    "secret-key": secretKey
  };
}

function getAuthHeaders() {
  const apiKey = process.env.VTPASS_API_KEY;
  const publicKey = process.env.VTPASS_PUBLIC_KEY;
  if (!apiKey || !publicKey) throw new VtpassDataPlanError("VTpass API key and public key are not configured", { endpoint: "auth" });

  // VTpass docs: GET requests authenticate with api-key and public-key headers.
  return {
    "Content-Type": "application/json",
    "api-key": apiKey,
    "public-key": publicKey
  };
}

function safeResponseKeys(raw: unknown) {
  return raw && typeof raw === "object" ? Object.keys(raw as Record<string, unknown>).slice(0, 20) : [];
}

function logPlanDebug(message: string, context: VtpassFetchContext) {
  console.info("[vtpass:data-plans]", {
    message,
    selectedNetwork: context.selectedNetwork || null,
    serviceID: context.serviceID || null,
    endpoint: context.endpoint,
    status: context.status || null,
    responseKeys: context.responseKeys || []
  });
}

function dataPlanError(message: string, context: VtpassFetchContext) {
  logPlanDebug(message, context);
  return new VtpassDataPlanError(message, context);
}

function lagosRequestId(reference: string) {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Lagos",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  });
  const parts = Object.fromEntries(formatter.formatToParts(new Date()).map((part) => [part.type, part.value]));
  const prefix = `${parts.year}${parts.month}${parts.day}${parts.hour}${parts.minute}`;
  const suffix = reference.replace(/[^a-zA-Z0-9]/g, "").slice(-24);
  return `${prefix}${suffix}`;
}

async function postToVtpass(path: "/api/pay" | "/api/requery", payload: Record<string, string | number>) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), VTPASS_TIMEOUT_MS);

  try {
    const response = await fetch(`${configuredBaseUrl()}${path}`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    const raw = await parseResponse(response);
    return { response, raw };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("VTpass request timed out after 15 seconds");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

async function getFromVtpass(path: string, context: Omit<VtpassFetchContext, "endpoint" | "status" | "responseKeys"> = {}, timeoutMs = VTPASS_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const endpoint = `${configuredBaseUrl()}${path}`;

  try {
    const response = await fetch(endpoint, {
      method: "GET",
      headers: getAuthHeaders(),
      signal: controller.signal,
      cache: "no-store"
    });
    const raw = await parseResponse(response);
    logPlanDebug("VTpass GET completed", {
      ...context,
      endpoint,
      status: response.status,
      responseKeys: safeResponseKeys(raw)
    });
    return { response, raw };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw dataPlanError(`VTpass data plan request timed out after ${Math.round(timeoutMs / 1000)} seconds`, {
        ...context,
        endpoint
      });
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

async function parseResponse(response: Response) {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return { rawText: text };
  }
}

function nestedTransactions(raw: Record<string, unknown>) {
  const content = raw.content && typeof raw.content === "object" ? raw.content as Record<string, unknown> : {};
  return content.transactions && typeof content.transactions === "object" ? content.transactions as Record<string, unknown> : {};
}

function numberValue(value: unknown) {
  const number = Number(String(value ?? "").replace(/,/g, ""));
  return Number.isFinite(number) ? number : undefined;
}

function vtpassSuccess(raw: Record<string, unknown>, ok: boolean) {
  const transactions = nestedTransactions(raw);
  const responseDescription = String(raw.response_description || "").toUpperCase();
  const transactionStatus = String(transactions.status || "").toLowerCase();
  const code = String(raw.code || "");

  return ok && (
    responseDescription === "TRANSACTION SUCCESSFUL" ||
    transactionStatus === "delivered" ||
    code === "000"
  );
}

function normalize(raw: Record<string, unknown>, requestId: string, ok: boolean): VtuPurchaseResponse {
  const transactions = nestedTransactions(raw);
  const success = vtpassSuccess(raw, ok);
  const transactionId = String(transactions.transactionId || raw.transactionId || raw.requestId || requestId);
  const message = String(raw.response_description || raw.message || (success ? "VTpass transaction successful" : "VTpass transaction failed"));

  return {
    success,
    provider: vtpassProvider.name,
    requestId: String(raw.requestId || requestId),
    providerReference: transactionId,
    message,
    commission: numberValue(transactions.commission),
    totalAmount: numberValue(transactions.total_amount),
    raw
  };
}

function parseVtpassProviderCode(providerCode?: string) {
  const [provider, serviceID, variationCode] = String(providerCode || "").split(":");
  if (provider !== "vtpass" || !serviceID || !variationCode) return null;
  return { serviceID, variationCode };
}

function stringValue(value: unknown) {
  return value === undefined || value === null ? "" : String(value).trim();
}

function numberValueOrZero(value: unknown) {
  const numeric = Number(stringValue(value).replace(/,/g, ""));
  return Number.isFinite(numeric) ? numeric : 0;
}

function dataSizeFromName(name: string) {
  return name.match(/(\d+(?:\.\d+)?\s*(?:MB|GB|TB))/i)?.[1]?.toUpperCase().replace(/\s+/g, "") || "Data";
}

function validityFromName(name: string) {
  return name.match(/(?:-|for)\s*([^-\n]*?(?:hrs?|hours?|days?|weeks?|months?))/i)?.[1]?.trim() || "See plan";
}

function normalizeVariation(serviceID: string, item: Record<string, unknown>): VtuDataPlan | null {
  const network = serviceIdNetworks[serviceID];
  const variationCode = stringValue(item.variation_code || item.variationCode || item.code);
  if (!network || !variationCode) return null;

  const name = stringValue(item.name || item.variation_name || variationCode);
  const amount = numberValueOrZero(item.variation_amount || item.amount || item.price);
  if (amount <= 0) return null;

  return {
    network,
    name: name.slice(0, 80),
    dataSize: dataSizeFromName(name).slice(0, 30),
    validity: validityFromName(name).slice(0, 40),
    providerCode: `vtpass:${serviceID}:${variationCode}`.slice(0, 80),
    providerCost: amount,
    sellingPrice: amount,
    productType: serviceID
  };
}

function serviceIdFromItem(item: Record<string, unknown>) {
  return stringValue(item.serviceID || item.serviceId || item.service_id || item.identifier || item.id);
}

function providerMessage(raw: Record<string, unknown>, fallback: string) {
  return stringValue(raw.response_description || raw.message || raw.error || fallback);
}

function uniquePlansByProviderCode(plans: VtuDataPlan[]) {
  const unique = new Map<string, VtuDataPlan>();
  plans.forEach((plan) => {
    if (!unique.has(plan.providerCode)) unique.set(plan.providerCode, plan);
  });
  return Array.from(unique.values());
}

export const vtpassProvider: VtuProvider = {
  name: "vtpass",
  supports(input) {
    return input.serviceType === ServiceType.AIRTIME || Boolean(parseVtpassProviderCode(input.providerCode));
  },
  async purchase(input: VtuPurchaseInput) {
    if (input.serviceType === ServiceType.DATA) {
      const plan = parseVtpassProviderCode(input.providerCode);
      if (!plan) {
        return {
          success: false,
          provider: this.name,
          requestId: input.reference,
          providerReference: `VTPASS-${input.reference}`,
          message: "VTpass data plan code is not valid"
        };
      }

      const requestId = lagosRequestId(input.reference);
      const { response, raw } = await postToVtpass("/api/pay", {
        request_id: requestId,
        serviceID: plan.serviceID,
        billersCode: input.phoneNumber,
        variation_code: plan.variationCode,
        amount: input.amount,
        phone: input.phoneNumber
      });

      return normalize(raw as Record<string, unknown>, requestId, response.ok);
    }

    if (input.serviceType !== ServiceType.AIRTIME) {
      return {
        success: false,
        provider: this.name,
        requestId: input.reference,
        providerReference: `VTPASS-${input.reference}`,
        message: "VTpass data variation-code mapping is not configured yet"
      };
    }

    const requestId = lagosRequestId(input.reference);
    const serviceID = airtimeServiceIds[input.network];
    if (!serviceID) {
      return {
        success: false,
        provider: this.name,
        requestId,
        providerReference: `VTPASS-${requestId}`,
        message: "Unsupported VTpass airtime network"
      };
    }

    const { response, raw } = await postToVtpass("/api/pay", {
      request_id: requestId,
      serviceID,
      amount: input.amount,
      phone: input.phoneNumber
    });

    return normalize(raw as Record<string, unknown>, requestId, response.ok);
  },
  async requery(requestId: string) {
    const { response, raw } = await postToVtpass("/api/requery", { request_id: requestId });
    return normalize(raw as Record<string, unknown>, requestId, response.ok);
  }
};

export async function fetchVtpassDataPlans(network?: Network | string | null): Promise<VtuDataPlan[]> {
  const selectedNetworks = network && Object.prototype.hasOwnProperty.call(dataServiceIds, network)
    ? [network as Network]
    : (Object.keys(dataServiceIds) as Network[]);

  const allowedServiceIds = new Set(selectedNetworks.flatMap((item) => dataServiceIds[item]));
  const servicesResponse = await getFromVtpass(
    "/api/services?identifier=data",
    { selectedNetwork: network },
    VTPASS_PLAN_TIMEOUT_MS
  );
  if (!servicesResponse.response.ok) {
    throw dataPlanError("VTpass data services could not be loaded right now", {
      selectedNetwork: network,
      endpoint: `${configuredBaseUrl()}/api/services?identifier=data`,
      status: servicesResponse.response.status,
      responseKeys: safeResponseKeys(servicesResponse.raw)
    });
  }

  const servicesRaw = servicesResponse.raw as Record<string, unknown>;
  const serviceItems = Array.isArray(servicesRaw.content) ? servicesRaw.content as Array<Record<string, unknown>> : [];
  if (!Array.isArray(servicesRaw.content)) {
    throw dataPlanError("VTpass returned a bad response format for data services", {
      selectedNetwork: network,
      endpoint: `${configuredBaseUrl()}/api/services?identifier=data`,
      status: servicesResponse.response.status,
      responseKeys: safeResponseKeys(servicesRaw)
    });
  }

  const serviceIds = serviceItems
    .map((item) => serviceIdFromItem(item))
    .filter((serviceID) => allowedServiceIds.has(serviceID));

  logPlanDebug("Resolved VTpass data service IDs", {
    selectedNetwork: network,
    serviceID: serviceIds.join(",") || undefined,
    endpoint: `${configuredBaseUrl()}/api/services?identifier=data`,
    status: servicesResponse.response.status,
    responseKeys: safeResponseKeys(servicesRaw)
  });

  if (serviceIds.length === 0) {
    throw dataPlanError("VTpass data service was not found for the selected network", {
      selectedNetwork: network,
      endpoint: `${configuredBaseUrl()}/api/services?identifier=data`,
      status: servicesResponse.response.status,
      responseKeys: safeResponseKeys(servicesRaw)
    });
  }

  const plans = await Promise.all(serviceIds.map(async (serviceID) => {
    const path = `/api/service-variations?serviceID=${encodeURIComponent(serviceID)}`;
    const { response, raw } = await getFromVtpass(path, { selectedNetwork: network, serviceID }, VTPASS_PLAN_TIMEOUT_MS);
    if (!response.ok) {
      throw dataPlanError(providerMessage(raw as Record<string, unknown>, "VTpass data plans could not be loaded right now"), {
        selectedNetwork: network,
        serviceID,
        endpoint: `${configuredBaseUrl()}${path}`,
        status: response.status,
        responseKeys: safeResponseKeys(raw)
      });
    }

    const rawObject = raw as Record<string, unknown>;
    const content = rawObject.content && typeof rawObject.content === "object" ? rawObject.content as Record<string, unknown> : {};
    const variations = Array.isArray(content.variations) ? content.variations : [];
    if (!Array.isArray(content.variations)) {
      throw dataPlanError("VTpass returned a bad response format for data plan variations", {
        selectedNetwork: network,
        serviceID,
        endpoint: `${configuredBaseUrl()}${path}`,
        status: response.status,
        responseKeys: safeResponseKeys(rawObject)
      });
    }

    return variations
      .map((item) => normalizeVariation(serviceID, item as Record<string, unknown>))
      .filter((plan): plan is VtuDataPlan => Boolean(plan));
  }));

  return uniquePlansByProviderCode(plans.flat());
}
