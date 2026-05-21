import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { emailService } from "@/services/email/email.service";

function appUrl() {
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function createEmailVerification(user: { id: string; email: string; fullName: string }) {
  const token = crypto.randomBytes(32).toString("hex");
  await prisma.verificationToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(token),
      type: "EMAIL_VERIFICATION",
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24)
    }
  });

  const link = `${appUrl()}/verify-email?token=${token}`;
  await emailService.send({
    to: user.email,
    subject: "Verify your Obmapay email",
    html: `<p>Hello ${user.fullName},</p><p>Verify your email to activate wallet funding and purchases.</p><p><a href="${link}">Verify email</a></p>`
  });

  return { token, link };
}

export async function createEmailVerificationToken(userId: string) {
  const token = crypto.randomBytes(32).toString("hex");
  await prisma.verificationToken.create({
    data: {
      userId,
      tokenHash: hashToken(token),
      type: "EMAIL_VERIFICATION",
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24)
    }
  });
  return token;
}

export async function sendEmailVerification(user: { email: string; fullName: string }, token: string) {
  const link = `${appUrl()}/verify-email?token=${token}`;
  await emailService.send({
    to: user.email,
    subject: "Verify your Obmapay email",
    html: `<p>Hello ${user.fullName},</p><p>Verify your email to activate wallet funding and purchases.</p><p><a href="${link}">Verify email</a></p>`
  });
  return { link };
}

export async function verifyEmailToken(token: string) {
  const tokenHash = hashToken(token);
  const record = await prisma.verificationToken.findUnique({ where: { tokenHash }, include: { user: true } });
  if (!record || record.usedAt || record.expiresAt < new Date()) return null;

  return prisma.$transaction(async (tx) => {
    await tx.verificationToken.update({ where: { id: record.id }, data: { usedAt: new Date() } });
    return tx.user.update({ where: { id: record.userId }, data: { emailVerifiedAt: new Date() } });
  });
}
