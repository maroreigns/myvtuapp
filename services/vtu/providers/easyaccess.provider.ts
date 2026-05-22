import { Network, ServiceType } from "@prisma/client";
import { VtuDataPlan, VtuProvider, VtuPurchaseInput, VtuPurchaseResponse } from "@/services/vtu/types";

const EASYACCESS_TIMEOUT_MS = 15_000;
const EASYACCESS_RETRIES = 1;

const networkIds: Record<Network, number> = {
  MTN: 1,
  GLO: 2,
  AIRTEL: 3,
  NINE_MOBILE: 4
};

const networkNames: Record<number, Network> = {
  1: "MTN",
  2: "GLO",
  3: "AIRTEL",
  4: "NINE_MOBILE"
};

const dataProductTypes: Record<Network, string[]> = {
  MTN: ["mtn_cg", "mtn_sme"],
  GLO: ["glo_cg", "glo_sme"],
  AIRTEL: ["airtel_cg", "airtel_sme"],
  NINE_MOBILE: ["etisalat_cg", "etisalat_sme"]
};

function baseUrl() {
  return (process.env.EASYACCESS_BASE_URL || "https://easyaccessapi.com.ng").replace(/\/$/, "");
}

function authToken() {
  return process.env.EASYACCESS_AUTH_TOKEN;
}

function endpoint(kind: "airtime" | "data" | "plans") {
  const configured = {
    airtime: process.env.EASYACCESS_AIRTIME_ENDPOINT,
    data: process.env.EASYACCESS_DATA_ENDPOINT,
    plans: undefined
  }[kind];
  const path = configured || {
    airtime: "/api/airtime",
    data: "/api/live/v1/purchase-data",
    plans: "/api/live/v1/get-plans"
  }[kind];

  return `${baseUrl()}${path.startsWith("/") ? path : `/${path}`}`;
}

function testMode() {
  return process.env.EASYACCESS_TEST_MODE === "true" || process.env.VTU_PROVIDER_MODE === "mock";
}

async function postToEasyAccess(pathKind: "airtime" | "data", input: Record<string, string | number | undefined>) {
  const token = authToken();
  if (!token) throw new Error("EasyAccessAPI token is not configured");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), EASYACCESS_TIMEOUT_MS);

  const body = new URLSearchParams();
  Object.entries(input).forEach(([key, value]) => {
    if (value !== undefined && value !== "") body.set(key, String(value));
  });

  try {
    const response = await fetch(endpoint(pathKind), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Cache-Control": "no-cache",
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body,
      signal: controller.signal
    });

    const raw = await parseResponse(response);
    return { response, raw };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("EasyAccessAPI request timed out after 15 seconds");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMessage: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), EASYACCESS_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(timeoutMessage);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

async function retry<T>(operation: () => Promise<T>) {
  let lastError: unknown;
  for (let attempt = 0; attempt <= EASYACCESS_RETRIES; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt < EASYACCESS_RETRIES) {
        await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
      }
    }
  }
  throw lastError;
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

function isSuccess(raw: Record<string, unknown>, ok: boolean) {
  const status = String(raw.status || raw.Status || raw.code || raw.response || "").toLowerCase();
  const message = String(raw.message || raw.Message || raw.description || "").toLowerCase();
  return ok && (
    ["success", "successful", "delivered", "completed", "queued", "pending"].includes(status) ||
    message.includes("success") ||
    message.includes("successful")
  );
}

function providerReference(raw: Record<string, unknown>, fallback: string) {
  return String(
    raw.provider_reference ||
      raw.providerReference ||
      raw.reference ||
      raw.transaction_reference ||
      raw.transaction_id ||
      raw.id ||
      fallback
  );
}

function providerMessage(raw: Record<string, unknown>, success: boolean) {
  return String(raw.message || raw.Message || raw.description || (success ? "EasyAccessAPI purchase successful" : "EasyAccessAPI purchase failed"));
}

function mockResponse(input: VtuPurchaseInput): VtuPurchaseResponse {
  const shouldFail = input.phoneNumber.endsWith("0000") || input.reference.includes("FAIL");
  return {
    success: !shouldFail,
    provider: easyAccessProvider.name,
    requestId: input.reference,
    providerReference: `EASYACCESS-TEST-${input.reference}`,
    message: shouldFail ? "EasyAccessAPI test failure simulation" : "EasyAccessAPI test purchase successful",
    raw: { testMode: true, simulatedFailure: shouldFail }
  };
}

export const easyAccessProvider: VtuProvider = {
  name: "easyaccess",
  async purchase(input) {
    if (testMode()) return mockResponse(input);

    const network = networkIds[input.network];
    if (!network) {
      return {
        success: false,
        provider: this.name,
        requestId: input.reference,
        providerReference: `EASYACCESS-${input.reference}`,
        message: "Unsupported EasyAccessAPI network"
      };
    }

    if (input.serviceType === ServiceType.DATA && !input.providerCode) {
      return {
        success: false,
        provider: this.name,
        requestId: input.reference,
        providerReference: `EASYACCESS-${input.reference}`,
        message: "EasyAccessAPI data plan ID is required"
      };
    }

    const payload =
      input.serviceType === ServiceType.AIRTIME
        ? {
            network,
            amount: input.amount,
            mobileno: input.phoneNumber,
            client_reference: input.reference
          }
        : {
            network,
            dataplan: input.providerCode,
            mobileno: input.phoneNumber,
            client_reference: input.reference
          };

    const { response, raw } = await postToEasyAccess(input.serviceType === ServiceType.AIRTIME ? "airtime" : "data", payload);
    const rawObject = raw as Record<string, unknown>;
    const success = isSuccess(rawObject, response.ok);

    return {
      success,
      provider: this.name,
      requestId: input.reference,
      providerReference: providerReference(rawObject, `EASYACCESS-${input.reference}`),
      message: providerMessage(rawObject, success),
      raw
    };
  }
};

function stringValue(value: unknown) {
  return value === undefined || value === null ? "" : String(value).trim();
}

function numberValue(value: unknown) {
  const numeric = Number(stringValue(value).replace(/,/g, ""));
  return Number.isFinite(numeric) ? numeric : 0;
}

function planNetwork(value: unknown): Network | null {
  const normalized = stringValue(value).toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (normalized === "1" || normalized === "MTN") return "MTN";
  if (normalized === "2" || normalized === "GLO") return "GLO";
  if (normalized === "3" || normalized === "AIRTEL") return "AIRTEL";
  if (normalized === "4" || normalized === "9MOBILE" || normalized === "NINEMOBILE") return "NINE_MOBILE";
  return networkNames[Number(value)] || null;
}

function productTypeLabel(productType?: string) {
  const normalized = stringValue(productType).toLowerCase();
  if (normalized.includes("sme")) return "SME";
  if (normalized.includes("cg")) return "CG";
  return "DATA";
}

function networkLabel(network: Network) {
  return network === "NINE_MOBILE" ? "9mobile" : network.charAt(0) + network.slice(1).toLowerCase();
}

function normalizePlan(item: Record<string, unknown>, fallbackNetwork?: Network, productType?: string): VtuDataPlan | null {
  const network = planNetwork(item.network || item.network_id || item.networkId || item.network_name || item.networkName) || fallbackNetwork || null;
  const providerCode = stringValue(item.dataplan || item.dataplan_id || item.data_plan_id || item.plan_id || item.planId || item.id || item.code);
  if (!network || !providerCode) return null;

  const price = numberValue(item.price || item.amount || item.plan_amount || item.selling_price || item.sellingPrice);
  const cost = numberValue(item.provider_cost || item.providerCost || item.cost || price);
  const rawSize = stringValue(item.dataSize || item.data_size || item.size || item.plan || item.plan_name || item.name) || "Data plan";
  const dataSize = rawSize.replace(/\s+/g, " ");
  const validity = stringValue(item.validity || item.duration || item.validity_days || item.validity_period) || "30 days";
  const defaultName = `${networkLabel(network)} ${productTypeLabel(productType)} ${dataSize}`;

  return {
    network,
    name: stringValue(item.name || item.plan_name || defaultName).slice(0, 80),
    dataSize: dataSize.slice(0, 30),
    validity: validity.slice(0, 40),
    providerCode: providerCode.slice(0, 80),
    providerCost: cost,
    sellingPrice: price || cost,
    productType
  };
}

function collectPlanItems(value: unknown, fallbackNetwork?: Network): Array<{ item: Record<string, unknown>; network?: Network }> {
  if (Array.isArray(value)) {
    return value.flatMap((item) => collectPlanItems(item, fallbackNetwork));
  }

  if (!value || typeof value !== "object") return [];

  const object = value as Record<string, unknown>;
  const directCode = object.dataplan || object.plan_id || object.planId || object.id || object.code;
  if (directCode && (object.price || object.amount || object.selling_price || object.sellingPrice || object.name || object.plan_name)) {
    return [{ item: object, network: fallbackNetwork }];
  }

  return Object.entries(object).flatMap(([key, child]) => {
    const nextNetwork = planNetwork(key) || fallbackNetwork;
    return collectPlanItems(child, nextNetwork);
  });
}

function networkFromInput(network?: string | null): Network | null {
  return planNetwork(network);
}

function productTypesForNetwork(network?: string | null) {
  const selected = networkFromInput(network);
  if (selected) return dataProductTypes[selected].map((productType) => ({ network: selected, productType }));

  return Object.entries(dataProductTypes).flatMap(([key, productTypes]) =>
    productTypes.map((productType) => ({ network: key as Network, productType }))
  );
}

async function fetchPlansForProductType(productType: string, network: Network) {
  const token = authToken();
  if (!token) throw new Error("EasyAccessAPI token is not configured");

  const url = `${endpoint("plans")}?product_type=${encodeURIComponent(productType)}`;
  const response = await retry(() =>
    fetchWithTimeout(
      url,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Cache-Control": "no-cache"
        }
      },
      "EasyAccessAPI data plan request timed out after 15 seconds"
    )
  );
  const raw = await parseResponse(response);
  if (!response.ok) throw new Error(providerMessage(raw as Record<string, unknown>, false));

  return collectPlanItems(raw, network)
    .map(({ item, network: itemNetwork }) => normalizePlan(item, itemNetwork || network, productType))
    .filter((plan): plan is VtuDataPlan => Boolean(plan));
}

export async function fetchEasyAccessDataPlans(network?: string | null): Promise<VtuDataPlan[]> {
  if (testMode()) return [];

  const batches = await Promise.all(productTypesForNetwork(network).map(({ productType, network }) => fetchPlansForProductType(productType, network)));
  return batches.flat();
}
