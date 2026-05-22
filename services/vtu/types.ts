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
  provider: string;
  requestId: string;
  providerReference: string;
  message: string;
  commission?: number;
  totalAmount?: number;
  raw?: unknown;
};

export type VtuProvider = {
  name: string;
  supports?(input: VtuPurchaseInput): boolean;
  purchase(input: VtuPurchaseInput): Promise<VtuPurchaseResponse>;
  requery?(requestId: string): Promise<VtuPurchaseResponse>;
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
