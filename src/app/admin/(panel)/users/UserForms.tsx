"use client";

import { useActionState } from "react";
import { changePassword, createUser } from "./actions";
import { Field } from "@/components/admin/ui";

function Message({ state }: { state: { error?: string; ok?: string } | null }) {
  if (state?.error) return <p className="text-sm text-brand-600">{state.error}</p>;
  if (state?.ok) return <p className="text-sm text-emerald-700">{state.ok}</p>;
  return null;
}

export function CreateUserForm() {
  const [state, action, pending] = useActionState(createUser, null);
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-5 sm:items-end">
      <Field label="ชื่อผู้ใช้ (ใช้ล็อกอิน)">
        <input name="username" required className="input" autoComplete="off" />
      </Field>
      <Field label="ชื่อที่แสดง">
        <input name="name" required className="input" />
      </Field>
      <Field label="รหัสผ่าน (8 ตัวขึ้นไป)">
        <input name="password" type="password" required minLength={8} className="input" autoComplete="new-password" />
      </Field>
      <Field label="สิทธิ์">
        <select name="role" defaultValue="staff" className="input">
          <option value="staff">พนักงาน</option>
          <option value="admin">แอดมิน (จัดการพนักงานได้)</option>
        </select>
      </Field>
      <button disabled={pending} className="btn-primary">เพิ่มพนักงาน</button>
      <div className="sm:col-span-5"><Message state={state} /></div>
    </form>
  );
}

export function ChangePasswordForm({ id }: { id: number }) {
  const [state, action, pending] = useActionState(changePassword, null);
  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="id" value={id} />
      <input
        name="password"
        type="password"
        required
        minLength={8}
        placeholder="รหัสผ่านใหม่"
        className="input w-40 py-1 text-sm"
        autoComplete="new-password"
      />
      <button disabled={pending} className="rounded border border-gray-300 px-2 py-1 text-sm hover:bg-gray-50">เปลี่ยน</button>
      <Message state={state} />
    </form>
  );
}
