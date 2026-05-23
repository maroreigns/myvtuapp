import { NextRequest } from "next/server";
import { Network } from "@prisma/client";
import { jsonOk } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { vtuService } from "@/services/vtu.service";
import { VtpassDataPlanError } from "@/services/vtu/providers/vtpass.provider";

export const dynamic = "force-dynamic";

const LIVE_PLAN_TIMEOUT_MS = 6_000;
const STORED_PLAN_TIMEOUT_MS = 2_000;
const CACHE_TTL_MS = 10 * 60 * 1000;

type PlanPayload = {
  id: string;
  network: Network;
  name: string;
  dataSize: string;
  validity: string;
  providerCode: string;
  sellingPrice: number;
};

type PlanResponse = {
  success: boolean;
  plans: PlanPayload[];
  error: string | null;
  provider: "vtpass" | "vtpass-cache";
  source?: "provider" | "memory" | "database";
};

type MemoryCacheEntry = {
  plans: PlanPayload[];
  fetchedAt: number;
};

const globalForDataPlans = globalThis as typeof globalThis & {
  obmapayDataPlanCache?: Record<string, MemoryCacheEntry>;
  obmapayDataPlanRefreshes?: Partial<Record<string, Promise<void>>>;
};

const memoryCache = globalForDataPlans.obmapayDataPlanCache ?? {};
const backgroundRefreshes = globalForDataPlans.obmapayDataPlanRefreshes ?? {};
globalForDataPlans.obmapayDataPlanCache = memoryCache;
globalForDataPlans.obmapayDataPlanRefreshes = backgroundRefreshes;

function isNetwork(value: string | null): value is Network {
  return value === "MTN" || value === "GLO" || value === "AIRTEL" || value === "NINE_MOBILE";
}

function cacheKey(network?: Network) {
  return network || "ALL";
}

function isFresh(entry?: MemoryCacheEntry) {
  return Boolean(entry && Date.now() - entry.fetchedAt < CACHE_TTL_MS);
}

function mapLivePlan(plan: {
  network: Network;
  name: string;
  dataSize: string;
  validity: string;
  providerCode: string;
  sellingPrice: number;
}): PlanPayload {
  return {
    id: plan.providerCode,
    network: plan.network,
    name: plan.name,
    dataSize: plan.dataSize,
    validity: plan.validity,
    providerCode: plan.providerCode,
    sellingPrice: Number(plan.sellingPrice)
  };
}

function sortPlans(plans: PlanPayload[]) {
  return [...plans].sort((a, b) => {
    if (a.network !== b.network) return a.network.localeCompare(b.network);
    return a.sellingPrice - b.sellingPrice;
  });
}

function filterPlansForNetwork(plans: PlanPayload[], selectedNetwork?: Network) {
  return selectedNetwork ? plans.filter((plan) => plan.network === selectedNetwork) : plans;
}

function logPlanResult(selectedNetwork: Network | undefined, serviceID: string, plans: PlanPayload[], source: string) {
  console.info("[data-plans] network result", {
    selectedNetwork: selectedNetwork || "ALL",
    resolvedServiceID: serviceID,
    planCount: plans.length,
    firstPlans: plans.slice(0, 3).map((plan) => `${plan.name} - ${plan.validity} - NGN ${plan.sellingPrice.toLocaleString()}`),
    source
  });
}

async function withTimeout<T>(operation: Promise<T>, timeoutMs: number, message: string) {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => reject(new Error(message)), timeoutMs);
  });

  try {
    return await Promise.race([operation, timeoutPromise]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

function logPlanFailure(error: unknown, selectedNetwork?: Network) {
  if (error instanceof VtpassDataPlanError) {
    console.error("[data-plans] VTpass fetch failed", {
      selectedNetwork,
      reason: error.message,
      endpoint: error.context.endpoint,
      serviceID: error.context.serviceID || null,
      status: error.context.status || null,
      responseKeys: error.context.responseKeys || []
    });
    return;
  }

  console.error("[data-plans] VTpass plan load failed", {
    selectedNetwork,
    reason: error instanceof Error ? error.message : "Unknown provider error"
  });
}

async function loadLivePlans(selectedNetwork?: Network) {
  const result = await withTimeout(
    vtuService.syncDataPlans(selectedNetwork),
    LIVE_PLAN_TIMEOUT_MS,
    "VTpass data plan fetch timed out"
  );
  if (result.synced === 0) throw new Error("VTpass returned no data plans for this network");

  const plans = filterPlansForNetwork(sortPlans(result.plans.map(mapLivePlan)), selectedNetwork);
  memoryCache[cacheKey(selectedNetwork)] = { plans, fetchedAt: Date.now() };

  if (result.cacheError) {
    console.warn("[data-plans] VTpass plans loaded but persistent cache update failed", {
      selectedNetwork,
      reason: result.cacheError
    });
  }

  return plans;
}

function refreshInBackground(selectedNetwork?: Network) {
  const key = cacheKey(selectedNetwork);
  if (backgroundRefreshes[key]) return;

  backgroundRefreshes[key] = loadLivePlans(selectedNetwork)
    .then(() => undefined)
    .catch((error) => logPlanFailure(error, selectedNetwork))
    .finally(() => {
      delete backgroundRefreshes[key];
    });
}

async function loadStoredPlans(selectedNetwork?: Network) {
  const plans = await withTimeout(
    prisma.dataPlan.findMany({
      where: { isActive: true, ...(selectedNetwork ? { network: selectedNetwork } : {}) },
      orderBy: [{ network: "asc" }, { sellingPrice: "asc" }]
    }),
    STORED_PLAN_TIMEOUT_MS,
    "Stored data plans could not be loaded quickly"
  );

  return filterPlansForNetwork(plans.map((plan) => ({
    id: plan.id,
    network: plan.network,
    name: plan.name,
    dataSize: plan.dataSize,
    validity: plan.validity,
    providerCode: plan.providerCode,
    sellingPrice: Number(plan.sellingPrice)
  })), selectedNetwork);
}

export async function GET(request: NextRequest) {
  const network = request.nextUrl.searchParams.get("network");
  if (network && !isNetwork(network)) {
    return jsonOk<PlanResponse>({
      success: false,
      plans: [],
      error: "Unsupported data network",
      provider: "vtpass"
    }, 422);
  }

  const selectedNetwork: Network | undefined = isNetwork(network) ? network : undefined;
  const key = cacheKey(selectedNetwork);
  const cached = memoryCache[key];

  const cachedPlans = filterPlansForNetwork(cached?.plans || [], selectedNetwork);
  if (cachedPlans.length) {
    if (!isFresh(cached)) refreshInBackground(selectedNetwork);
    logPlanResult(selectedNetwork, cacheKey(selectedNetwork), cachedPlans, "memory");
    return jsonOk<PlanResponse>({
      success: true,
      provider: "vtpass-cache",
      source: "memory",
      error: null,
      plans: cachedPlans
    });
  }

  try {
    const storedPlans = await loadStoredPlans(selectedNetwork);
    if (storedPlans.length > 0) {
      memoryCache[key] = { plans: storedPlans, fetchedAt: Date.now() };
      refreshInBackground(selectedNetwork);
      logPlanResult(selectedNetwork, cacheKey(selectedNetwork), storedPlans, "database");
      return jsonOk<PlanResponse>({
        success: true,
        provider: "vtpass-cache",
        source: "database",
        error: null,
        plans: storedPlans
      });
    }
  } catch (error) {
    console.warn("[data-plans] Stored plan fallback unavailable", {
      selectedNetwork,
      reason: error instanceof Error ? error.message : "Unknown database error"
    });
  }

  try {
    const plans = await loadLivePlans(selectedNetwork);
    logPlanResult(selectedNetwork, cacheKey(selectedNetwork), plans, "provider");
    return jsonOk<PlanResponse>({
      success: true,
      provider: "vtpass",
      source: "provider",
      error: null,
      plans
    });
  } catch (error) {
    logPlanFailure(error, selectedNetwork);
    return jsonOk<PlanResponse>({
      success: false,
      provider: "vtpass",
      error: "Data plans are unavailable right now.",
      plans: []
    }, 503);
  }
}
