type InitializePaymentInput = {
  email: string;
  amount: number;
  reference: string;
};

export const paystackService = {
  async initializePayment(input: InitializePaymentInput) {
    return {
      gateway: "PAYSTACK" as const,
      reference: input.reference,
      authorizationUrl: `${process.env.APP_URL || "http://localhost:3000"}/wallet?reference=${input.reference}`,
      accessCode: `mock_${input.reference}`,
      amount: input.amount,
      email: input.email
    };
  },

  async verifyPayment(reference: string) {
    return {
      reference,
      status: "success" as const,
      paidAt: new Date().toISOString(),
      message: "Mock Paystack payment confirmed"
    };
  }
};
