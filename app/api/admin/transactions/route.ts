import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin) return jsonError("Admin access required", 403);

  const status = request.nextUrl.searchParams.get("status") || undefined;
  const transactions = await prisma.serviceTransaction.findMany({
    where: status ? { status: status as never } : {},
    include: { user: { select: { fullName: true, email: true, phone: true } }, plan: true },
    orderBy: { createdAt: "desc" },
    take: 200
  });

  return jsonOk({
    transactions: transactions.map((item) => ({
      ...item,
      amount: Number(item.amount),
      providerCost: Number(item.providerCost),
      profit: Number(item.profit),
      plan: item.plan
        ? { ...item.plan, providerCost: Number(item.plan.providerCost), sellingPrice: Number(item.plan.sellingPrice) }
        : null
    }))
  });
}
