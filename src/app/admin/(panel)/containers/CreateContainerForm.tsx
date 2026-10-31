"use client";

import { useActionState } from "react";
import { Field, MethodSelect } from "@/components/admin/ui";
import { createContainer } from "./actions";

export function CreateContainerForm() {
  const [error, action, pending] = useActionState(createContainer, null);
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-5 sm:items-end">
      <Field label="เลขตู้ *">
        <input name="code" required className="input uppercase" placeholder="เช่น SEA-2611-01" />
      </Field>
      <Field label="วิธีขนส่ง">
        <MethodSelect />
      </Field>
      <Field label="บริษัทขนส่ง">
        <input name="provider" className="input" />
      </Field>
      <Field label="External ID">
        <input name="externalId" className="input" />
      </Field>
      <button disabled={pending} className="btn-primary">สร้างตู้</button>
      {error && <p className="text-sm text-brand-600 sm:col-span-5">{error}</p>}
    </form>
  );
}
