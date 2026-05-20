"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { readApiResponse } from "@/lib/client-response";

export function ProfileForms({ user }: { user: { fullName: string; phone: string; email: string } }) {
  const router = useRouter();

  async function updateProfile(formData: FormData) {
    const response = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fullName: String(formData.get("fullName")), phone: String(formData.get("phone")) })
    });
    const { data, error } = await readApiResponse<{ error?: string }>(response);
    response.ok ? toast.success("Profile updated") : toast.error(data.error || error || "Profile update failed");
    router.refresh();
  }

  async function changePassword(formData: FormData) {
    const response = await fetch("/api/profile/password", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword: String(formData.get("currentPassword")), newPassword: String(formData.get("newPassword")) })
    });
    const { data, error } = await readApiResponse<{ error?: string }>(response);
    response.ok ? toast.success("Password changed") : toast.error(data.error || error || "Password change failed");
  }

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <form action={updateProfile} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="font-bold">Profile</h2>
        <input disabled value={user.email} className="mt-4 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-500" />
        <input name="fullName" defaultValue={user.fullName} className="mt-3 w-full rounded-lg border border-slate-300 px-3 py-2" />
        <input name="phone" defaultValue={user.phone} className="mt-3 w-full rounded-lg border border-slate-300 px-3 py-2" />
        <button className="mt-4 rounded-lg bg-brand-600 px-4 py-2 font-semibold text-white">Save changes</button>
      </form>
      <form action={changePassword} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="font-bold">Change password</h2>
        <input name="currentPassword" type="password" placeholder="Current password" className="mt-4 w-full rounded-lg border border-slate-300 px-3 py-2" />
        <input name="newPassword" type="password" placeholder="New password" className="mt-3 w-full rounded-lg border border-slate-300 px-3 py-2" />
        <button className="mt-4 rounded-lg bg-slate-950 px-4 py-2 font-semibold text-white">Update password</button>
      </form>
    </div>
  );
}
