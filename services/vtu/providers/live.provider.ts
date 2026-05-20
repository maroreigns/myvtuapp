import { VtuProvider } from "@/services/vtu/types";

export const liveVtuProvider: VtuProvider = {
  name: "live",
  async purchase(input) {
    const baseUrl = process.env.VTU_API_BASE_URL;
    const apiKey = process.env.VTU_API_KEY;

    if (!baseUrl || !apiKey) {
      return {
        success: false,
        providerReference: `LIVE-${input.reference}`,
        message: "Live VTU provider is not configured"
      };
    }

    const endpoint = input.serviceType === "AIRTIME" ? "/airtime" : "/data";
    const response = await fetch(`${baseUrl.replace(/\/$/, "")}${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        network: input.network,
        phone: input.phoneNumber,
        amount: input.amount,
        plan_code: input.providerCode,
        reference: input.reference
      })
    });

    const raw = await response.json().catch(() => ({}));
    const status = String((raw as { status?: string }).status || "").toLowerCase();
    const success = response.ok && ["success", "successful", "completed", "delivered"].includes(status);

    return {
      success,
      providerReference: String((raw as { reference?: string; transaction_id?: string }).reference || (raw as { transaction_id?: string }).transaction_id || `LIVE-${input.reference}`),
      message: String((raw as { message?: string }).message || (success ? "VTU purchase successful" : "VTU purchase failed")),
      raw
    };
  }
};
