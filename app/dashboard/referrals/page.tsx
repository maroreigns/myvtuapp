import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createReference } from "@/lib/reference";
import { prisma } from "@/lib/prisma";
import { referralSummary } from "@/services/referral.service";

export default async function ReferralsPage() {
  const user = await requireUser();
  if (!user) redirect("/login");

  const referralCode = user.referralCode || (await prisma.user.update({ where: { id: user.id }, data: { referralCode: createReference("REF") } })).referralCode!;
  const summary = await referralSummary(user.id);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const link = `${appUrl}/register?ref=${referralCode}`;
  const total = summary.earnings.reduce((sum, item) => sum + Number(item.amount), 0);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Referrals</h1>
        <p className="mt-1 text-sm text-slate-500">Invite users and earn after their first successful transaction.</p>
      </div>
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-sm text-slate-500">Referral link</p>
        <p className="mt-2 break-all rounded-lg bg-slate-50 p-3 font-mono text-sm">{link}</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div><p className="text-sm text-slate-500">Invited users</p><p className="text-2xl font-bold">{summary.invitedUsers.length}</p></div>
          <div><p className="text-sm text-slate-500">Total earnings</p><p className="text-2xl font-bold">NGN {total.toLocaleString()}</p></div>
        </div>
      </section>
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="font-bold">Invited users</h2>
        <div className="mt-4 divide-y divide-slate-100">
          {summary.invitedUsers.map((item) => (
            <div key={item.id} className="flex items-center justify-between py-3 text-sm">
              <span>{item.fullName}</span>
              <span className="text-slate-500">{item.createdAt.toLocaleDateString()}</span>
            </div>
          ))}
          {summary.invitedUsers.length === 0 && <p className="py-8 text-center text-sm text-slate-500">No referred users yet.</p>}
        </div>
      </section>
    </div>
  );
}
