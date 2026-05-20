import { AuthForm } from "@/components/AuthForm";
import { Logo } from "@/components/Logo";

export default function RegisterPage({ searchParams }: { searchParams: { ref?: string } }) {
  return (
    <main className="grid min-h-screen place-items-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-center"><Logo /></div>
        <h1 className="text-center text-2xl font-bold">Create your NaijaDataHub account</h1>
        <p className="mb-6 mt-2 text-center text-sm text-slate-500">Fund, buy, and track your digital services securely.</p>
        <AuthForm mode="register" referralCode={searchParams.ref || ""} />
      </div>
    </main>
  );
}
