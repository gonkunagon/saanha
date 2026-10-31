"use client";

import { useActionState, useState } from "react";
import { createOrder } from "../actions";

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
    <form action={action} className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>

      <div>
        <p className="mb-2 font-semibold">รายการสินค้า</p>
        <div className="space-y-2">
          <div className="hidden gap-2 text-xs text-gray-500 sm:grid sm:grid-cols-[3fr_1fr_1fr_1fr_1fr_2fr_auto]">
            <span>ชื่อสินค้า</span><span>จำนวน</span><span>กล่อง</span><span>กก.</span><span>คิว</span><span>เลขพัสดุจีน</span><span />
          </div>
          {rows.map((key, i) => (
            <div key={key} className="grid gap-2 rounded-lg bg-gray-50 p-2 sm:grid-cols-[3fr_1fr_1fr_1fr_1fr_2fr_auto] sm:bg-transparent sm:p-0">
              <input name="itemDescription" placeholder={`สินค้า ${i + 1}`} className="input" required={i === 0} />
              <input name="itemQuantity" type="number" min={0} placeholder="จำนวน" className="input" />
              <input name="itemBoxes" type="number" min={0} placeholder="กล่อง" className="input" />
              <input name="itemWeightKg" type="number" step="0.01" min={0} placeholder="กก." className="input" />
              <input name="itemCbm" type="number" step="0.001" min={0} placeholder="คิว" className="input" />
              <input name="itemChinaTrackingNo" placeholder="เลขพัสดุจีน" className="input" />
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
          ))}
        </div>
        <button type="button" onClick={addRow} className="mt-2 text-sm font-medium text-brand-600 hover:underline">
          + เพิ่มสินค้าอีกรายการ
        </button>
        <p className="mt-1 text-xs text-gray-500">ขนาด น้ำหนัก เลขพัสดุจีน ไม่ต้องกรอกตอนนี้ก็ได้ ค่อยแก้ทีหลังได้</p>
      </div>

      {error && <p className="text-sm text-brand-600">{error}</p>}
      <button disabled={pending} className="btn-primary">{pending ? "กำลังสร้าง..." : "สร้างออเดอร์"}</button>
    </form>
  );
}
