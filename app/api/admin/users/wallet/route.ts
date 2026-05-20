import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/http";
import { adminWalletAdjustSchema } from "@/lib/validators";
import { adjustWallet } from "@/lib/wallet";

export async function POST(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin) return jsonError("Admin access required", 403);

  const body = adminWalletAdjustSchema.safeParse(await request.json());
  if (!body.success) return jsonError(body.error.errors[0]?.message || "Invalid request", 422);

  try {
    const walletTransaction = await adjustWallet(body.data);
    return jsonOk({
      walletTransaction: {
        ...walletTransaction,
        amount: Number(walletTransaction.amount),
        balanceBefore: Number(walletTransaction.balanceBefore),
        balanceAfter: Number(walletTransaction.balanceAfter)
      }
    });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Wallet adjustment failed", 400);
  }
}
