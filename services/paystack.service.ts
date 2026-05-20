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

function appUrl() {
  return process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || "http://localhost:3000";
}

export const paystackService = {
  async initializePayment(input: InitializePaymentInput) {
    if (secretKey()) {
      const response = await fetch(`${paystackBaseUrl}/transaction/initialize`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${secretKey()}`
        },
        body: JSON.stringify({
          email: input.email,
          amount: Math.round(input.amount * 100),
          reference: input.reference,
          callback_url: input.callbackUrl || `${appUrl()}/dashboard/wallet/success?reference=${input.reference}`
        })
      });
      const data = (await response.json()) as PaystackResponse<{
        authorization_url: string;
        access_code: string;
        reference: string;
      }>;

      if (!response.ok || !data.status) {
        throw new Error(data.message || "Paystack payment initialization failed");
      }

      return {
        gateway: "PAYSTACK" as const,
        reference: data.data.reference,
        authorizationUrl: data.data.authorization_url,
        accessCode: data.data.access_code,
        amount: input.amount,
        email: input.email
      };
    }

    return {
      gateway: "PAYSTACK" as const,
      reference: input.reference,
      authorizationUrl: `${appUrl()}/dashboard/wallet/success?reference=${input.reference}`,
      accessCode: `mock_${input.reference}`,
      amount: input.amount,
      email: input.email
    };
  },

  async verifyPayment(reference: string) {
    if (secretKey()) {
      const response = await fetch(`${paystackBaseUrl}/transaction/verify/${encodeURIComponent(reference)}`, {
        headers: { Authorization: `Bearer ${secretKey()}` }
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
          message: data.message || "Paystack verification failed"
        };
      }

      return {
        reference: data.data.reference,
        status: data.data.status,
        paidAt: data.data.paid_at || null,
        gatewayReference: String(data.data.id),
        amount: data.data.amount / 100,
        message: data.data.gateway_response || data.message
      };
    }

    return {
      reference,
      status: "success" as const,
      paidAt: new Date().toISOString(),
      gatewayReference: `mock_${reference}`,
      amount: 0,
      message: "Mock Paystack payment confirmed"
    };
  }
};
