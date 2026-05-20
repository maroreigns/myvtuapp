import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin) return jsonError("Admin access required", 403);

  const q = request.nextUrl.searchParams.get("q") || "";
  const users = await prisma.user.findMany({
    where: q
      ? {
          OR: [
            { fullName: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
            { phone: { contains: q, mode: "insensitive" } }
          ]
        }
      : {},
    select: { id: true, fullName: true, email: true, phone: true, role: true, walletBalance: true, createdAt: true },
    orderBy: { createdAt: "desc" },
    take: 100
  });

  return jsonOk({ users: users.map((item) => ({ ...item, walletBalance: Number(item.walletBalance) })) });
}
