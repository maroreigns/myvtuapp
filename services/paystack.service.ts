type InitializePaymentInput = {
  email: string;
  amount: number;
  reference: string;
  callbackUrl?: string;
};

type PaystackResponse<T> = {
  status: boolean;
  message: string;
  data: T;
};

const paystackBaseUrl = "https://api.paystack.co";

function secretKey() {
  return process.env.PAYSTACK_SECRET_KEY || "";
}

function baseUrl() {
  return process.env.PAYSTACK_BASE_URL || paystackBaseUrl;
}

function appUrl() {
  return process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || "http://localhost:3000";
}

export const paystackService = {
  async initializePayment(input: InitializePaymentInput) {
    const key = secretKey();
    if (!key) {
      throw new Error("Paystack secret key is not configured");
    }

    const response = await fetch(`${baseUrl()}/transaction/initialize`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`
      },
      body: JSON.stringify({
        email: input.email,
        amount: Math.round(input.amount * 100),
        reference: input.reference,
        callback_url: input.callbackUrl || `${appUrl()}/api/wallet/verify?reference=${input.reference}`
      })
    });
    const data = (await response.json()) as PaystackResponse<{
      authorization_url: string;
      access_code: string;
      reference: string;
    }>;

    if (!response.ok || !data.status) {
      const error = new Error(data.message || "Paystack payment initialization failed");
      (error as Error & { raw?: unknown }).raw = data;
      throw error;
    }

    return {
      gateway: "PAYSTACK" as const,
      reference: data.data.reference,
      authorizationUrl: data.data.authorization_url,
      accessCode: data.data.access_code,
      amount: input.amount,
      email: input.email,
      raw: data
    };
  },

  async verifyPayment(reference: string) {
    const key = secretKey();
    if (!key) {
      return {
        reference,
        status: "failed" as const,
        paidAt: null,
        gatewayReference: undefined,
        amount: 0,
        amountKobo: 0,
        message: "Paystack secret key is not configured",
        raw: null,
        verified: false
      };
    }

    const response = await fetch(`${baseUrl()}/transaction/verify/${encodeURIComponent(reference)}`, {
      headers: { Authorization: `Bearer ${key}` }
    });
    const data = (await response.json()) as PaystackResponse<{
      id: number;
      reference: string;
      status: string;
      paid_at?: string;
      gateway_response?: string;
      amount: number;
    }>;

    if (!response.ok || !data.status) {
      return {
        reference,
        status: "failed" as const,
        paidAt: null,
        gatewayReference: undefined,
        amount: 0,
        amountKobo: 0,
        message: data.message || "Paystack verification failed",
        raw: data,
        verified: false
      };
    }

    return {
      reference: data.data.reference,
      status: data.data.status,
      paidAt: data.data.paid_at || null,
      gatewayReference: String(data.data.id),
      amount: data.data.amount / 100,
      amountKobo: data.data.amount,
      message: data.data.gateway_response || data.message,
      raw: data,
      verified: true
    };
  }
};
