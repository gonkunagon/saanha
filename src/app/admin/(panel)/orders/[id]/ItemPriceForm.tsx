"use client";

import { useEffect, useState, useTransition } from "react";
import { updateItemPrice } from "../actions";

// แก้ราคาต่อหน่วยในรายการสินค้า — กดบันทึกแล้วขึ้น "บันทึกแล้ว" สักครู่ ให้รู้ว่าบันทึกสำเร็จ
export function ItemPriceForm({ itemId, unitPrice, placeholder }: { itemId: number; unitPrice: number | null; placeholder: string }) {
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!saved) return;
    const t = setTimeout(() => setSaved(false), 3000);
    return () => clearTimeout(t);
  }, [saved]);

  return (
    <form
      action={(fd) =>
        startTransition(async () => {
          await updateItemPrice(fd);
          setSaved(true);
        })
      }
      className="flex items-center gap-1.5"
    >
      <input type="hidden" name="itemId" value={itemId} />
      <label className="text-xs text-gray-500" htmlFor={`price-${itemId}`}>ราคา/หน่วย</label>
      <span className="w-28">
        <input
          id={`price-${itemId}`}
          name="unitPrice"
          type="number"
          step="0.01"
          min={0}
          defaultValue={unitPrice ?? ""}
          placeholder={placeholder}
          onChange={() => setSaved(false)}
          className="input py-1 text-sm"
        />
      </span>
      <button
        disabled={pending}
        className="rounded border border-brand-600 px-2 py-1 text-xs font-medium text-brand-600 hover:bg-brand-50 disabled:opacity-50"
      >
        {pending ? "กำลังบันทึก…" : "บันทึก"}
      </button>
      {saved && (
        <span role="status" className="text-xs font-medium whitespace-nowrap text-green-700">✓ บันทึกสำเร็จ</span>
      )}
    </form>
  );
}
