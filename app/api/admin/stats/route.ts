import { NextRequest } from "next/server";
import { TransactionStatus } from "@prisma/client";
import { requireAdmin } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin) return jsonError("Admin access required", 403);

  const [
    totalUsers,
    walletAggregate,
    paystackFundingAggregate,
    salesAggregate,
    profitAggregate,
    successfulTransactions,
    failedTransactions,
    refundedTransactions,
    pendingWalletFunding,
    providerFailureCount
  ] =
    await Promise.all([
      prisma.user.count(),
      prisma.user.aggregate({ _sum: { walletBalance: true } }),
      prisma.payment.aggregate({
        where: { gateway: "PAYSTACK", status: TransactionStatus.SUCCESSFUL },
        _sum: { amount: true }
      }),
      prisma.serviceTransaction.aggregate({
        _sum: { amount: true }
      }),
      prisma.serviceTransaction.aggregate({
        where: { status: TransactionStatus.SUCCESSFUL },
        _sum: { profit: true }
      }),
      prisma.serviceTransaction.count({ where: { status: TransactionStatus.SUCCESSFUL } }),
      prisma.serviceTransaction.count({ where: { status: TransactionStatus.FAILED } }),
      prisma.serviceTransaction.count({ where: { status: TransactionStatus.REFUNDED } }),
      prisma.payment.count({ where: { status: TransactionStatus.PENDING } }),
      prisma.vtuApiLog.count({ where: { status: TransactionStatus.FAILED } })
    ]);

  return jsonOk({
    totalUsers,
    totalWalletBalance: Number(walletAggregate._sum.walletBalance || 0),
    totalPaystackFunding: Number(paystackFundingAggregate._sum.amount || 0),
    totalSales: Number(salesAggregate._sum.amount || 0),
    totalProfit: Number(profitAggregate._sum.profit || 0),
    successfulTransactions,
    failedTransactions,
    refundedTransactions,
    pendingWalletFunding,
    providerFailureCount
  });
}
