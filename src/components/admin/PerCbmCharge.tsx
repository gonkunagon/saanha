"use client";

import { useEffect, useRef, useState } from "react";
import { Field } from "@/components/admin/ui";

// ฝากส่ง + ใส่คิวเอง: ช่องราคาต่อคิว + ช่อง "รวม" (ราคา × คิวรวมทุกแถวพัสดุในฟอร์ม · คำนวณทันทีที่พิมพ์)
// คิวของแต่ละแถวมาจาก <input data-row-cbm> ที่ PackageFields ใส่ไว้
export function PerCbmCharge({ defaultValue }: { defaultValue: number | null | undefined }) {
  const ref = useRef<HTMLDivElement>(null);
  const [price, setPrice] = useState(defaultValue == null ? "" : String(defaultValue));
  const [cbm, setCbm] = useState(0);

  useEffect(() => {
    const form = ref.current?.closest("form");
    if (!form) return;
    const sum = () =>
      setCbm([...form.querySelectorAll<HTMLInputElement>("input[data-row-cbm]")].reduce((s, e) => s + (Number(e.value) || 0), 0));
    // รอ React วาดค่าใหม่ก่อนค่อยรวม
    const later = () => requestAnimationFrame(sum);
    sum();
    form.addEventListener("input", later);
    form.addEventListener("click", later);
    form.addEventListener("focusout", later);
    return () => {
      form.removeEventListener("input", later);
      form.removeEventListener("click", later);
      form.removeEventListener("focusout", later);
    };
  }, []);

  const total = Number(price) > 0 ? Math.round(Number(price) * cbm * 100) / 100 : null;
  return (
    <div ref={ref} className="grid grid-cols-2 gap-3">
      <Field label="ค่าขนส่งที่คิดลูกค้า (บาท / คิว)">
        <input name="shippingChargePerCbm" type="number" step="0.01" min={0} value={price} onChange={(e) => setPrice(e.target.value)} className="input" />
      </Field>
      <Field label={`รวม (${Math.round(cbm * 10_000) / 10_000} คิว)`}>
        <input readOnly tabIndex={-1} value={total == null ? "" : total.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} className="input bg-gray-50 font-semibold" aria-label="รวมค่าขนส่ง (บาท)" />
      </Field>
    </div>
  );
}
