import bcrypt from "bcryptjs";
import { PrismaClient, Role, Network } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("Password123!", 12);

  await prisma.user.upsert({
    where: { email: "admin@obmapay.com" },
    update: { referralCode: "ADMINREF", emailVerifiedAt: new Date() },
    create: {
      fullName: "ObmaPay Admin",
      email: "admin@obmapay.com",
      phone: "08000000001",
      passwordHash,
      role: Role.ADMIN,
      walletBalance: 0,
      referralCode: "ADMINREF",
      emailVerifiedAt: new Date()
    }
  });

  await prisma.user.upsert({
    where: { email: "user@obmapay.com" },
    update: { referralCode: "USERREF", emailVerifiedAt: new Date() },
    create: {
      fullName: "Demo Customer",
      email: "user@obmapay.com",
      phone: "08000000002",
      passwordHash,
      role: Role.USER,
      walletBalance: 5000,
      referralCode: "USERREF",
      emailVerifiedAt: new Date()
    }
  });

  for (const network of [Network.MTN, Network.AIRTEL, Network.GLO, Network.NINE_MOBILE]) {
    await prisma.airtimePricing.upsert({
      where: { network },
      update: { discountPercent: 0, providerCostPercent: 98, isActive: true },
      create: { network, discountPercent: 0, providerCostPercent: 98, isActive: true }
    });
  }

  const defaultReferral = await prisma.referralCommissionSetting.findFirst({ where: { serviceType: null } });
  if (defaultReferral) {
    await prisma.referralCommissionSetting.update({
      where: { id: defaultReferral.id },
      data: { percentage: 1.5, flatAmount: 0, isActive: true }
    });
  } else {
    await prisma.referralCommissionSetting.create({
      data: { serviceType: null, percentage: 1.5, flatAmount: 0, isActive: true }
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
