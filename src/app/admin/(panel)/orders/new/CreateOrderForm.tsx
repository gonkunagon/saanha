"use client";

import { useActionState } from "react";
import { createOrder } from "../actions";

export function CreateOrderForm({ children }: { children: React.ReactNode }) {
  const [error, action, pending] = useActionState(createOrder, null);
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      {children}
      {error && <p className="text-sm text-brand-600 sm:col-span-2">{error}</p>}
      <div className="sm:col-span-2">
        <button disabled={pending} className="btn-primary">{pending ? "กำลังสร้าง..." : "สร้างออเดอร์"}</button>
      </div>
    </form>
  );
}
