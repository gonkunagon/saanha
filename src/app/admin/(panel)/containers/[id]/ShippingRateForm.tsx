"use client";

import { useEffect, useState, useTransition } from "react";
import { updateOrderShippingRate } from "../actions";

// เรทค่าขนส่งของออเดอร์ (บาท / คิว) — เว้นว่าง = ใช้เรทมาตรฐาน · บันทึกแล้วขึ้น ✓ สักครู่
export function ShippingRateForm({ orderId, rate, defaultRate }: { orderId: number; rate: number | null; defaultRate: number }) {
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
          await updateOrderShippingRate(fd);
          setSaved(true);
        })
      }
      className="flex items-center gap-1"
    >
      <input type="hidden" name="orderId" value={orderId} />
      <input
        name="shippingRate"
        type="number"
        step="0.01"
        min={0}
        defaultValue={rate ?? ""}
        placeholder={defaultRate.toLocaleString("th-TH")}
        onChange={() => setSaved(false)}
        aria-label="เรทค่าขนส่ง (บาท / คิว)"
        className="w-20 rounded border border-gray-300 px-1.5 py-0.5 text-right text-xs"
      />
      <button
        disabled={pending}
        className="rounded border border-brand-600 px-1.5 py-0.5 text-xs font-medium text-brand-600 hover:bg-brand-50 disabled:opacity-50"
      >
        {pending ? "…" : "บันทึก"}
      </button>
      {saved && <span role="status" className="text-xs font-medium text-green-700">✓</span>}
    </form>
  );
}
