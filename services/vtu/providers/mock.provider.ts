import { VtuProvider } from "@/services/vtu/types";

export const mockVtuProvider: VtuProvider = {
  name: "mock",
  async purchase(input) {
    const shouldFail = input.phoneNumber.endsWith("0000");

    if (shouldFail) {
      return {
        success: false,
        provider: this.name,
        requestId: input.reference,
        providerReference: `MOCK-${input.reference}`,
        message: "Mock VTU provider rejected this test number",
        raw: { reason: "TEST_FAILURE" }
      };
    }

    return {
      success: true,
      provider: this.name,
      requestId: input.reference,
      providerReference: `MOCK-${input.reference}`,
      message:
        input.serviceType === "AIRTIME"
          ? `Mock airtime top-up queued for ${input.network}`
          : `Mock data delivery queued for ${input.providerCode}`,
      raw: { status: "queued" }
    };
  }
};
