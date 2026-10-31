"use client";

import { useActionState } from "react";
import { login } from "./actions";

export function LoginForm() {
  const [error, action, pending] = useActionState(login, null);

  return (
    <form action={action} className="space-y-4">
      <label className="block">
        <span className="mb-1 block text-sm font-medium">ชื่อผู้ใช้</span>
        <input name="username" required autoComplete="username" className="input" />
      </label>
      <label className="block">
        <span className="mb-1 block text-sm font-medium">รหัสผ่าน</span>
        <input name="password" type="password" required autoComplete="current-password" className="input" />
      </label>
      {error && <p className="text-sm text-brand-600">{error}</p>}
      <button type="submit" disabled={pending} className="btn-primary w-full">
        {pending ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
      </button>
    </form>
  );
}
