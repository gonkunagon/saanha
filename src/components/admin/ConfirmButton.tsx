"use client";

import { useRef } from "react";

// ปุ่มที่ถามยืนยันก่อนส่งฟอร์ม (ใช้กับการลบ) — ใช้หน้าต่างในหน้าเว็บ (<dialog>) แทน confirm() ของเบราว์เซอร์
// เพราะเบราว์เซอร์บางตัว (เช่น เบราว์เซอร์ในแอป) บล็อก confirm() แล้วตอบ "ยกเลิก" ทันที ทำให้กดแล้วไม่เกิดอะไร
// หน้าต่างอยู่ใน <form> เดียวกับปุ่ม ปุ่ม "ยืนยัน" จึงส่งฟอร์มนั้นได้ตรง ๆ
export function ConfirmButton({
  message,
  children,
  className = "text-sm text-brand-600 hover:underline",
  formAction,
}: {
  message: string;
  children: React.ReactNode;
  className?: string;
  formAction?: (fd: FormData) => void | Promise<void>;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  return (
    <>
      <button type="button" onClick={() => dialogRef.current?.showModal()} className={className}>
        {children}
      </button>
      <dialog
        ref={dialogRef}
        className="m-auto w-[min(24rem,calc(100vw-2rem))] rounded-2xl p-6 text-left shadow-2xl backdrop:bg-black/40"
      >
        <p className="text-base font-medium whitespace-normal text-gray-900">{message}</p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            autoFocus
            onClick={() => dialogRef.current?.close()}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50"
          >
            ยกเลิก
          </button>
          <button
            type="submit"
            formAction={formAction}
            onClick={() => dialogRef.current?.close()}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            ยืนยัน
          </button>
        </div>
      </dialog>
    </>
  );
}
