"use client";

import { useRef, useState, useTransition } from "react";
import type { Customer } from "@/db/schema";
import { Field } from "@/components/admin/ui";
import { createCustomer, updateCustomer, type CustomerFormState } from "./actions";

// ฟอร์มเพิ่ม / แก้ไขลูกค้า (มี customer = แก้ไข)
// เรียก action เองแทน action={...} เพื่อไม่ให้ React ล้างช่องที่กรอกไว้เมื่อบันทึกไม่ผ่าน
// onCreated = เพิ่มสำเร็จแล้ว (เช่น ปิดหน้าต่างเพิ่มลูกค้า)
export function CustomerForm({ customer, onCreated, onCancel }: { customer?: Customer; onCreated?: () => void; onCancel?: () => void }) {
  const [state, setState] = useState<CustomerFormState>(null);
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        startTransition(async () => {
          const result = await (customer ? updateCustomer : createCustomer)(null, fd);
          setState(result);
          if (!customer && result?.ok) {
            formRef.current?.reset();
            onCreated?.();
          }
        });
      }}
      className="grid gap-4 sm:grid-cols-2"
    >
      {customer && <input type="hidden" name="id" value={customer.id} />}
      {/* ชื่อที่ใช้เรียกอยู่บนสุด · รหัสลูกค้าระบบรันให้เอง (แสดงอย่างเดียวตอนแก้ไข) */}
      <Field label="ชื่อที่ใช้เรียก / แสดงในออเดอร์ * (เช่น ชื่อเล่น ชื่อร้าน)" className={customer?.code ? "" : "sm:col-span-2"}>
        <input name="name" required defaultValue={customer?.name} className="input" />
      </Field>
      {customer?.code && (
        <Field label="รหัสลูกค้า (ระบบออกให้)">
          <input value={customer.code} readOnly tabIndex={-1} className="input bg-gray-50 font-mono text-gray-500" />
        </Field>
      )}
      <Field label="ชื่อจริง">
        <input name="firstName" defaultValue={customer?.firstName ?? ""} className="input" />
      </Field>
      <Field label="นามสกุล">
        <input name="lastName" defaultValue={customer?.lastName ?? ""} className="input" />
      </Field>
      <Field label="เบอร์โทร (ไม่บังคับ — ลูกค้าใช้ 4 ตัวท้ายเช็คสถานะพัสดุ)">
        <input name="phone" type="tel" defaultValue={customer?.phone} className="input" />
      </Field>
      <Field label="LINE ID">
        <input name="lineId" defaultValue={customer?.lineId ?? ""} className="input" />
      </Field>
      <Field label="ที่อยู่จัดส่ง">
        <input name="address" defaultValue={customer?.address ?? ""} className="input" />
      </Field>
      <Field label="หมายเหตุ (ภายใน)" className="sm:col-span-2">
        <textarea name="note" rows={2} defaultValue={customer?.note ?? ""} className="input" />
      </Field>
      <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
        <button disabled={pending} className="btn-primary">
          {pending ? "กำลังบันทึก..." : customer ? "บันทึก" : "เพิ่มลูกค้า"}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="rounded-lg border border-gray-300 px-4 py-2 hover:bg-gray-50">
            ยกเลิก
          </button>
        )}
        {state?.error && <p className="text-sm text-brand-600">{state.error}</p>}
        {state?.ok && customer && <p className="text-sm text-emerald-700">{state.ok}</p>}
      </div>
    </form>
  );
}

// ปุ่ม "+ เพิ่มลูกค้า" เปิดหน้าต่างฟอร์ม — เพิ่มเสร็จปิดเอง รายชื่อด้านหลังอัปเดตตาม
export function AddCustomerButton() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  // เปลี่ยน key ทุกครั้งที่เปิด ให้ฟอร์มเริ่มใหม่ (ไม่ค้างข้อความ error รอบก่อน)
  const [round, setRound] = useState(0);
  const close = () => dialogRef.current?.close();

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setRound((r) => r + 1);
          dialogRef.current?.showModal();
        }}
        className="btn-primary"
      >
        + เพิ่มลูกค้า
      </button>
      <dialog
        ref={dialogRef}
        className="m-auto w-[min(40rem,calc(100vw-2rem))] rounded-2xl p-6 shadow-2xl backdrop:bg-black/40"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">เพิ่มลูกค้า</h2>
          <button type="button" onClick={close} aria-label="ปิด" className="px-2 text-gray-400 hover:text-gray-700">✕</button>
        </div>
        <CustomerForm key={round} onCreated={close} onCancel={close} />
      </dialog>
    </>
  );
}
