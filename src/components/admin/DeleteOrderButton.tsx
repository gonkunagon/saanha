"use client";

import { useRef } from "react";
import { useFormStatus } from "react-dom";
import { deleteOrder } from "@/app/admin/(panel)/orders/actions";

type Props = {
  orderId: number;
  code: string;
  customerName: string;
  itemCount: number;
  fromJj?: boolean;
  label?: string; // ไม่ใส่ = แสดงเป็นไอคอนถังขยะ
};

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
      <path d="M4 7h16M10 11v6M14 11v6M5 7l1 12a2 2 0 002 2h8a2 2 0 002-2l1-12M9 7V4h6v3" />
    </svg>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button disabled={pending} className="rounded-lg bg-brand-600 px-4 py-2 font-medium text-white hover:bg-brand-700 disabled:opacity-60">
      {pending ? "กำลังลบ…" : "ลบออเดอร์"}
    </button>
  );
}

// ปุ่มลบออเดอร์ + หน้าต่างยืนยันก่อนลบ
export function DeleteOrderButton({ orderId, code, customerName, itemCount, fromJj, label }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  return (
    <>
      <button
        type="button"
        onClick={() => dialogRef.current?.showModal()}
        title={`ลบออเดอร์ ${code}`}
        aria-label={`ลบออเดอร์ ${code}`}
        className={
          label
            ? "text-sm text-brand-600 hover:underline"
            : "rounded-lg p-1.5 text-gray-400 hover:bg-brand-50 hover:text-brand-600"
        }
      >
        {label ?? <TrashIcon className="h-5 w-5" />}
      </button>

      <dialog
        ref={dialogRef}
        className="m-auto w-[min(26rem,calc(100vw-2rem))] rounded-2xl p-0 shadow-2xl backdrop:bg-black/40"
      >
        <form action={deleteOrder} className="p-6">
          <input type="hidden" name="id" value={orderId} />
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600">
              <TrashIcon className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-lg font-semibold">ลบออเดอร์ {code}?</h2>
              <p className="mt-1 text-sm text-gray-600">
                {customerName} · {itemCount} รายการ
              </p>
            </div>
          </div>
          <p className="mt-4 rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-700">
            รายการสินค้าและพัสดุทั้งหมดในออเดอร์นี้จะถูกลบด้วย <b>กู้คืนไม่ได้</b>
          </p>
          {fromJj && (
            <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
              ออเดอร์นี้นำเข้าจาก JJ Cargo — ลบแล้วระบบจะไม่ดึงพัสดุเหล่านี้กลับมาอีกตอนซิงค์
            </p>
          )}
          <div className="mt-5 flex justify-end gap-2">
            <button
              type="button"
              autoFocus
              onClick={() => dialogRef.current?.close()}
              className="rounded-lg border border-gray-300 px-4 py-2 hover:bg-gray-50"
            >
              ยกเลิก
            </button>
            <SubmitButton />
          </div>
        </form>
      </dialog>
    </>
  );
}
