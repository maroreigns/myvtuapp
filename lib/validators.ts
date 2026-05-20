import { Network, PaymentGateway, TransactionStatus, WalletTransactionType } from "@prisma/client";
import { z } from "zod";

const phoneRegex = /^(070|080|081|090|091|071)\d{8}$/;

export const registerSchema = z.object({
  fullName: z.string().min(3).max(80),
  email: z.string().email().toLowerCase(),
  phone: z.string().regex(phoneRegex, "Enter a valid Nigerian phone number"),
  password: z.string().min(8).max(80)
});

export const loginSchema = z.object({
  email: z.string().email().toLowerCase(),
  password: z.string().min(1)
});

export const forgotPasswordSchema = z.object({
  email: z.string().email().toLowerCase()
});

export const resetPasswordSchema = z.object({
  token: z.string().min(10),
  password: z.string().min(8).max(80)
});

export const fundWalletSchema = z.object({
  amount: z.coerce.number().min(100).max(1000000),
  gateway: z.nativeEnum(PaymentGateway).default(PaymentGateway.PAYSTACK)
});

export const confirmPaymentSchema = z.object({
  reference: z.string().min(8)
});

export const purchaseDataSchema = z.object({
  planId: z.string().min(1),
  phoneNumber: z.string().regex(phoneRegex, "Enter a valid Nigerian phone number")
});

export const profileSchema = z.object({
  fullName: z.string().min(3).max(80),
  phone: z.string().regex(phoneRegex, "Enter a valid Nigerian phone number")
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(80)
});

export const dataPlanSchema = z.object({
  network: z.nativeEnum(Network),
  name: z.string().min(2).max(80),
  dataSize: z.string().min(1).max(30),
  validity: z.string().min(1).max(40),
  providerCode: z.string().min(2).max(80),
  providerCost: z.coerce.number().min(0),
  sellingPrice: z.coerce.number().min(0),
  isActive: z.boolean().default(true)
});

export const adminWalletAdjustSchema = z.object({
  userId: z.string().min(1),
  type: z.nativeEnum(WalletTransactionType),
  amount: z.coerce.number().min(1).max(10000000),
  description: z.string().min(3).max(200)
});

export const transactionStatusSchema = z.object({
  status: z.nativeEnum(TransactionStatus)
});
