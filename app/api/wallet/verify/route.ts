import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { readTokenFromRequest, verifyAuthToken } from "@/lib/auth";
import { finalizePaystackWalletFunding } from "@/lib/payments";
import { paystackService } from "@/services/paystack.service";

function walletRedirect(request: NextRequest, status: "success" | "failed", reference?: string, message?: string) {
  const url = new URL("/dashboard/wallet", request.url);
  url.searchParams.set("funding", status);
  if (reference) url.searchParams.set("reference", reference);
  if (message) url.searchParams.set("message", message);
  return NextResponse.redirect(url);
}

function walletPendingRedirect(request: NextRequest, reference: string, message?: string) {
  const url = new URL("/dashboard/wallet", request.url);
  url.searchParams.set("funding", "pending");
  url.searchParams.set("reference", reference);
  if (message) url.searchParams.set("message", message);
  return NextResponse.redirect(url);
}

export async function GET(request: NextRequest) {
  const user = verifyAuthToken(readTokenFromRequest(request));
  if (!user) {
    const url = new URL("/login", request.url);
    url.searchParams.set("next", "/dashboard/wallet");
    return NextResponse.redirect(url);
  }

  const reference = request.nextUrl.searchParams.get("reference") || request.nextUrl.searchParams.get("trxref");
  if (!reference) return walletRedirect(request, "failed", undefined, "Payment reference is missing");

  console.info("[wallet:verify] callback received", { reference });
  try {
    const verification = await paystackService.verifyPayment(reference);
    const rawResponse = verification.raw as Prisma.InputJsonValue | null;
    console.info("[wallet:verify] Paystack verification result", {
      reference,
      paystackReference: verification.reference,
      paystackStatus: verification.status,
      amountKobo: verification.amountKobo
    });

    const result = await finalizePaystackWalletFunding({
      reference,
      userId: user.id,
      status: verification.status,
      amountKobo: verification.amountKobo,
      gatewayReference: verification.gatewayReference,
      paidAt: verification.paidAt,
      message: verification.message,
      rawResponse,
      verified: verification.verified
    });

    if (result.failed) {
      return walletRedirect(request, "failed", reference, "Payment verification failed");
    }
    if (result.pending) {
      return walletPendingRedirect(request, reference, "Payment received, wallet confirmation is still processing. Please refresh shortly.");
    }

    return walletRedirect(request, "success", reference);
  } catch (error) {
    console.error("[wallet:verify] Paystack wallet funding failed", {
      reference,
      message: error instanceof Error ? error.message : "Unknown wallet funding error"
    });
    return walletPendingRedirect(request, reference, "Payment received, wallet confirmation is still processing. Please refresh shortly.");
  }
}
