import { Role } from "@prisma/client";
import { prisma } from "../lib/prisma";

async function main() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  if (!email) {
    throw new Error("ADMIN_EMAIL is required. Example: ADMIN_EMAIL=you@example.com npm run admin:promote");
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw new Error(`No user found for ADMIN_EMAIL=${email}`);
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { role: Role.ADMIN }
  });

  console.log(`Promoted ${email} to ADMIN`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
