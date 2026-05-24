import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { summarizeProviderResponse } from "@/lib/admin";
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
      id: item.id,
      reference: item.reference,
      providerReference: item.providerReference,
      serviceType: item.serviceType,
      network: item.network,
      phoneNumber: item.phoneNumber,
      status: item.status,
      responseSummary: summarizeProviderResponse(item.responseMessage),
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      amount: Number(item.amount),
      providerCost: Number(item.providerCost),
      profit: Number(item.profit),
      user: item.user,
      plan: item.plan
        ? { ...item.plan, providerCost: Number(item.plan.providerCost), sellingPrice: Number(item.plan.sellingPrice) }
        : null
    }))
  });
}
