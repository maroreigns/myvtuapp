import { redirect } from "next/navigation";
import { ProfileForms } from "@/components/ProfileForms";
import { requireUser } from "@/lib/auth";

export default async function ProfilePage() {
  const user = await requireUser();
  if (!user) redirect("/login");

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">Profile and Settings</h1>
      <ProfileForms user={{ fullName: user.fullName, email: user.email, phone: user.phone }} />
    </div>
  );
}
