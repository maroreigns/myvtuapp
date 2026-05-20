import { SmsStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type SendSmsInput = {
  userId?: string;
  phone: string;
  message: string;
};

export const smsService = {
  async send(input: SendSmsInput) {
    const provider = process.env.SMS_PROVIDER || "mock";

    if (provider === "mock" || !process.env.SMS_API_KEY) {
      return prisma.smsLog.create({
        data: {
          userId: input.userId,
          phone: input.phone,
          message: input.message,
          provider,
          status: SmsStatus.SENT,
          providerRef: `mock_${Date.now()}`
        }
      });
    }

    return prisma.smsLog.create({
      data: {
        userId: input.userId,
        phone: input.phone,
        message: input.message,
        provider,
        status: SmsStatus.PENDING
      }
    });
  }
};
