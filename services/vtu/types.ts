import { Network, ServiceType } from "@prisma/client";

export type VtuPurchaseInput = {
  serviceType: ServiceType;
  network: Network;
  phoneNumber: string;
  amount: number;
  reference: string;
  providerCode?: string;
  maxAmountPayable?: number;
};

export type VtuPurchaseResponse = {
  success: boolean;
  providerReference: string;
  message: string;
  raw?: unknown;
};

export type VtuProvider = {
  name: string;
  purchase(input: VtuPurchaseInput): Promise<VtuPurchaseResponse>;
};

export type VtuDataPlan = {
  network: Network;
  name: string;
  dataSize: string;
  validity: string;
  providerCode: string;
  providerCost: number;
  sellingPrice: number;
  productType?: string;
};
