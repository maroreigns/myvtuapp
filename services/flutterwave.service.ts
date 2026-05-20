type InitializePaymentInput = {
  email: string;
  amount: number;
  reference: string;
};

export const flutterwaveService = {
  async initializePayment(input: InitializePaymentInput) {
    return {
      gateway: "FLUTTERWAVE" as const,
      reference: input.reference,
      paymentLink: `${process.env.APP_URL || "http://localhost:3000"}/wallet?reference=${input.reference}`,
      amount: input.amount,
      email: input.email
    };
  },

  async verifyPayment(reference: string) {
    return {
      reference,
      status: "successful" as const,
      paidAt: new Date().toISOString(),
      message: "Mock Flutterwave payment confirmed"
    };
  }
};
