import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const user = await requireUser(request);
  if (!user) return jsonError("Unauthorized", 401);

  const status = request.nextUrl.searchParams.get("status") || undefined;
  const serviceType = request.nextUrl.searchParams.get("type") || undefined;

  const serviceTransactions = await prisma.serviceTransaction.findMany({
    where: { userId: user.id, ...(status ? { status: status as never } : {}), ...(serviceType ? { serviceType: serviceType as never } : {}) },
    include: { plan: true },
    orderBy: { createdAt: "desc" },
    take: 100
  });

  return jsonOk({
    transactions: serviceTransactions.map((item) => ({
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
