import { Network, ServiceType } from "@prisma/client";

export type VtuPurchaseInput = {
  serviceType: ServiceType;
  network: Network;
  phoneNumber: string;
  amount: number;
  reference: string;
  providerCode?: string;
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
