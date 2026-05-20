import { AuthForm } from "@/components/AuthForm";
import { Logo } from "@/components/Logo";

export default function LoginPage() {
  return (
    <main className="grid min-h-screen place-items-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-center"><Logo /></div>
        <h1 className="text-center text-2xl font-bold">Login to your wallet</h1>
        <p className="mb-6 mt-2 text-center text-sm text-slate-500">Use the seeded demo accounts or your own account.</p>
        <AuthForm mode="login" />
      </div>
    </main>
  );
}
