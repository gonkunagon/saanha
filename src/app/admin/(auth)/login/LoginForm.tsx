"use client";

import { startTransition, useActionState, useEffect, useRef } from "react";
import { login } from "./actions";

export function LoginForm() {
  const [error, action, pending] = useActionState(login, null);
  const passwordRef = useRef<HTMLInputElement>(null);

  // รหัสผ่านผิด: เก็บชื่อผู้ใช้ไว้ ล้างเฉพาะรหัสผ่านแล้วให้พิมพ์ใหม่ได้ทันที
  useEffect(() => {
    if (error && passwordRef.current) {
      passwordRef.current.value = "";
      passwordRef.current.focus();
    }
  }, [error]);

  return (
    // ส่งเองผ่าน onSubmit แทน action={...} เพราะ React จะล้างทั้งฟอร์มหลังส่ง
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        startTransition(() => action(fd));
      }}
      method="post"
      className="space-y-4"
    >
      <label className="block">
        <span className="mb-1 block text-sm font-medium">ชื่อผู้ใช้</span>
        <input name="username" required autoComplete="username" className="input" />
      </label>
      <label className="block">
        <span className="mb-1 block text-sm font-medium">รหัสผ่าน</span>
        <input ref={passwordRef} name="password" type="password" required autoComplete="current-password" className="input" />
      </label>
      {error && <p className="text-sm text-brand-600">{error}</p>}
      <button type="submit" disabled={pending} className="btn-primary w-full">
        {pending ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
      </button>
    </form>
  );
}
