import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const AUTH_COOKIE = "ndh_token";
const ONE_WEEK_SECONDS = 60 * 60 * 24 * 7;

export type AuthUser = {
  id: string;
  email: string;
  role: Role;
  fullName: string;
};

type TokenPayload = {
  sub: string;
  email: string;
  role: Role;
  fullName: string;
};

function jwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is required");
  }
  return secret;
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, passwordHash: string) {
  return bcrypt.compare(password, passwordHash);
}

export function signAuthToken(user: AuthUser) {
  return jwt.sign(
    { sub: user.id, email: user.email, role: user.role, fullName: user.fullName },
    jwtSecret(),
    { expiresIn: ONE_WEEK_SECONDS }
  );
}

export function setAuthCookie(token: string) {
  cookies().set(AUTH_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ONE_WEEK_SECONDS
  });
}

export function clearAuthCookie() {
  cookies().delete(AUTH_COOKIE);
}

export function readTokenFromRequest(request?: NextRequest) {
  return request?.cookies.get(AUTH_COOKIE)?.value || cookies().get(AUTH_COOKIE)?.value;
}

export function verifyAuthToken(token?: string): AuthUser | null {
  if (!token) return null;
  try {
    const payload = jwt.verify(token, jwtSecret()) as TokenPayload;
    return {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      fullName: payload.fullName
    };
  } catch (error) {
    console.warn("[auth] token verification failed", { message: error instanceof Error ? error.message : "Unknown token error" });
    return null;
  }
}

export async function requireUser(request?: NextRequest) {
  const session = verifyAuthToken(readTokenFromRequest(request));
  if (!session) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.id },
    select: {
      id: true,
      email: true,
      fullName: true,
      phone: true,
      role: true,
      walletBalance: true,
      emailVerifiedAt: true,
      isActive: true,
      referralCode: true,
      referralEarnings: true,
      createdAt: true
    }
  });

  if (!user) {
    console.warn("[auth] session user not found", { userId: session.id });
    return null;
  }

  if (!user.isActive) {
    console.warn("[auth] inactive user blocked", { userId: user.id });
    return null;
  }

  return user;
}

export async function requireAdmin(request?: NextRequest) {
  const user = await requireUser(request);
  if (!user || user.role !== Role.ADMIN) return null;
  return user;
}
