import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { LoginForm } from "./LoginForm";

export default async function LoginPage() {
  if (await getCurrentUser()) redirect("/admin");

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-800 via-brand-700 to-brand-500 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-xl">
        <p className="text-2xl font-bold text-brand-600">SANHA</p>
        <p className="mb-6 text-sm text-gray-500">ระบบหลังบ้านสำหรับพนักงาน</p>
        <LoginForm />
      </div>
    </main>
  );
}
