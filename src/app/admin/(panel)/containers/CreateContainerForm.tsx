"use client";

import { startTransition, useActionState, useRef, useState } from "react";
import { Field, MethodSelect } from "@/components/admin/ui";
import { createContainer } from "./actions";

// ปุ่ม "+ สร้างตู้" เปิดหน้าต่างฟอร์ม — สร้างสำเร็จระบบพาไปหน้าตู้ใหม่ (redirect ใน action)
// ส่งผ่าน startTransition แทน action={...} เพื่อไม่ให้ช่องที่กรอกหายเมื่อสร้างไม่ผ่าน (เช่น เลขตู้ซ้ำ)
function CreateContainerForm({ onCancel }: { onCancel: () => void }) {
  const [error, action, pending] = useActionState(createContainer, null);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        startTransition(() => action(fd));
      }}
      className="grid gap-4 sm:grid-cols-2"
    >
      <Field label="เลขตู้ *">
        <input name="code" required autoFocus className="input uppercase" placeholder="เช่น SEA-2611-01" autoComplete="off" />
      </Field>
      <Field label="วิธีขนส่ง">
        <MethodSelect />
      </Field>
      <Field label="บริษัทขนส่ง">
        <input name="provider" className="input" />
      </Field>
      <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
        <button disabled={pending} className="btn-primary">{pending ? "กำลังสร้าง..." : "สร้างตู้"}</button>
        <button type="button" onClick={onCancel} className="rounded-lg border border-gray-300 px-4 py-2 hover:bg-gray-50">
          ยกเลิก
        </button>
        {error && <p className="text-sm text-brand-600">{error}</p>}
      </div>
    </form>
  );
}

export function CreateContainerButton() {
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
        + สร้างตู้
      </button>
      <dialog
        ref={dialogRef}
        className="m-auto w-[min(40rem,calc(100vw-2rem))] rounded-2xl p-6 shadow-2xl backdrop:bg-black/40"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">สร้างตู้ใหม่</h2>
          <button type="button" onClick={close} aria-label="ปิด" className="px-2 text-gray-400 hover:text-gray-700">✕</button>
        </div>
        <CreateContainerForm key={round} onCancel={close} />
      </dialog>
    </>
  );
}
