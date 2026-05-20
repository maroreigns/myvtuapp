import bcrypt from "bcryptjs";
import { PrismaClient, Role, Network } from "@prisma/client";

const prisma = new PrismaClient();

const plans = [
  ["MTN SME 1GB", Network.MTN, "1GB", "30 days", "MTN_SME_1GB", 285, 330],
  ["MTN SME 2GB", Network.MTN, "2GB", "30 days", "MTN_SME_2GB", 565, 650],
  ["MTN SME 5GB", Network.MTN, "5GB", "30 days", "MTN_SME_5GB", 1375, 1550],
  ["Airtel CG 1GB", Network.AIRTEL, "1GB", "30 days", "AIRTEL_CG_1GB", 300, 350],
  ["Airtel CG 2GB", Network.AIRTEL, "2GB", "30 days", "AIRTEL_CG_2GB", 590, 680],
  ["Airtel CG 5GB", Network.AIRTEL, "5GB", "30 days", "AIRTEL_CG_5GB", 1420, 1600],
  ["Glo SME 1GB", Network.GLO, "1GB", "30 days", "GLO_SME_1GB", 275, 320],
  ["Glo SME 2GB", Network.GLO, "2GB", "30 days", "GLO_SME_2GB", 540, 630],
  ["Glo SME 5GB", Network.GLO, "5GB", "30 days", "GLO_SME_5GB", 1300, 1500],
  ["9mobile 1GB", Network.NINE_MOBILE, "1GB", "30 days", "9MOBILE_1GB", 315, 370],
  ["9mobile 2GB", Network.NINE_MOBILE, "2GB", "30 days", "9MOBILE_2GB", 610, 710],
  ["9mobile 5GB", Network.NINE_MOBILE, "5GB", "30 days", "9MOBILE_5GB", 1480, 1700]
] as const;

async function main() {
  const passwordHash = await bcrypt.hash("Password123!", 12);

  await prisma.user.upsert({
    where: { email: "admin@naijadatahub.com" },
    update: {},
    create: {
      fullName: "NaijaDataHub Admin",
      email: "admin@naijadatahub.com",
      phone: "08000000001",
      passwordHash,
      role: Role.ADMIN,
      walletBalance: 0
    }
  });

  await prisma.user.upsert({
    where: { email: "user@naijadatahub.com" },
    update: {},
    create: {
      fullName: "Demo Customer",
      email: "user@naijadatahub.com",
      phone: "08000000002",
      passwordHash,
      role: Role.USER,
      walletBalance: 5000
    }
  });

  for (const [name, network, dataSize, validity, providerCode, providerCost, sellingPrice] of plans) {
    await prisma.dataPlan.upsert({
      where: { providerCode },
      update: { name, network, dataSize, validity, providerCost, sellingPrice, isActive: true },
      create: { name, network, dataSize, validity, providerCode, providerCost, sellingPrice, isActive: true }
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
