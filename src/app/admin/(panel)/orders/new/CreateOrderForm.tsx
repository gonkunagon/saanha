"use client";

import { startTransition, useActionState, useState } from "react";
import { createOrder } from "../actions";
import { PackageFields } from "@/components/admin/PackageFields";

// สร้างออเดอร์พร้อมรายการสินค้าในหน้าเดียว (children = ช่องข้อมูลลูกค้า)
export function CreateOrderForm({ children }: { children: React.ReactNode }) {
  const [error, action, pending] = useActionState(createOrder, null);
  const [rows, setRows] = useState([0]);
  const [nextKey, setNextKey] = useState(1);

  const addRow = () => {
    setRows((r) => [...r, nextKey]);
    setNextKey((k) => k + 1);
  };
  const removeRow = (key: number) => setRows((r) => (r.length > 1 ? r.filter((k) => k !== key) : r));

  return (
    // ส่งผ่าน startTransition แทน action={...} — ถ้าบันทึกไม่ผ่าน (เช่น ลืมเลือกลูกค้า) ช่องที่กรอกไว้ไม่หาย
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        startTransition(() => action(fd));
      }}
      className="space-y-6"
    >
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>

      <div>
        <p className="mb-2 font-semibold">รายการสินค้า</p>
        <div className="space-y-3">
          {rows.map((key, i) => (
            <div key={key} className="space-y-2 rounded-lg border border-gray-200 p-3">
              <input type="hidden" name="itemKey" value={key} />
              <div className="grid gap-2 sm:grid-cols-[3fr_1fr_1fr_auto]">
                <input name="itemDescription" placeholder={`ชื่อสินค้า ${i + 1}`} className="input" required={i === 0} />
                <input name="itemQuantity" type="number" min={0} placeholder="จำนวน" className="input" />
                <input name="itemUnitPrice" type="number" step="0.01" min={0} placeholder="ราคาต่อหน่วย" className="input" />
                <button
                  type="button"
                  onClick={() => removeRow(key)}
                  disabled={rows.length === 1}
                  className="px-2 text-gray-400 hover:text-brand-600 disabled:invisible"
                  aria-label="ลบแถว"
                >
                  ✕
                </button>
              </div>
              <PackageFields prefix={`pkg_${key}_`} />
            </div>
          ))}
        </div>
        <button type="button" onClick={addRow} className="mt-2 text-sm font-medium text-brand-600 hover:underline">
          + เพิ่มสินค้าอีกรายการ
        </button>
        <p className="mt-1 text-xs text-gray-500">
          สินค้าที่มีหลายพัสดุหรือหลายขนาด กด "+ เพิ่มพัสดุ / ขนาดอื่น" · ระบบคำนวณคิวให้เอง · ขนาด น้ำหนัก เลขพัสดุจีน ไม่ต้องกรอกตอนนี้ก็ได้
        </p>
      </div>

      {error && <p className="text-sm text-brand-600">{error}</p>}
      <button disabled={pending} className="btn-primary">{pending ? "กำลังสร้าง..." : "สร้างออเดอร์"}</button>
    </form>
  );
}
