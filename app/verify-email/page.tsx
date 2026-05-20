import { Suspense } from "react";
import { VerifyEmailClient } from "@/components/VerifyEmailClient";

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<VerifyEmailShell message="Preparing verification..." />}>
      <VerifyEmailClient />
    </Suspense>
  );
}

function VerifyEmailShell({ message }: { message: string }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <section className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 text-center shadow-sm">
        <h1 className="text-2xl font-bold text-slate-950">Verify email</h1>
        <p className="mt-3 text-sm text-slate-600">{message}</p>
      </section>
    </main>
  );
}
