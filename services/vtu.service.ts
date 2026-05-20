type BuyDataInput = {
  providerCode: string;
  phoneNumber: string;
  reference: string;
};

export const vtuService = {
  async buyData(input: BuyDataInput) {
    const shouldFail = input.phoneNumber.endsWith("0000");

    if (shouldFail) {
      return {
        success: false,
        providerReference: `VTU-${input.reference}`,
        message: "Mock VTU provider rejected this test number"
      };
    }

    return {
      success: true,
      providerReference: `VTU-${input.reference}`,
      message: `Mock data delivery queued for ${input.providerCode}`
    };
  }
};
