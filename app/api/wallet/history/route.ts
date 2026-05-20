import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const user = await requireUser(request);
  if (!user) return jsonError("Unauthorized", 401);

  const transactions = await prisma.walletTransaction.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 100
  });

  return jsonOk({
    transactions: transactions.map((item) => ({
      ...item,
      amount: Number(item.amount),
      balanceBefore: Number(item.balanceBefore),
      balanceAfter: Number(item.balanceAfter)
    }))
  });
}
