"use client";

import { useEffect, useState, useTransition } from "react";
import { updateItemPrice } from "../actions";

const fmt = (n: number) => n.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// ช่องราคาซื้อ / ราคาขาย (ต่อหน่วย) ในตารางรายการสินค้า — แก้แล้วออกจากช่อง (หรือกด Enter) = บันทึกเอง
// ใต้ช่องแสดงยอดรวมของแถว (จำนวน × ราคา)
export function ItemPriceCells({ itemId, quantity, unitPrice, sellPrice }: { itemId: number; quantity: number | null; unitPrice: number | null; sellPrice: number | null }) {
  const [buy, setBuy] = useState(unitPrice == null ? "" : String(unitPrice));
  const [sell, setSell] = useState(sellPrice == null ? "" : String(sellPrice));
  const [saved, setSaved] = useState<"unitPrice" | "sellPrice" | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!saved) return;
    const t = setTimeout(() => setSaved(null), 2500);
    return () => clearTimeout(t);
  }, [saved]);

  const save = (field: "unitPrice" | "sellPrice", value: string, original: number | null) => {
    if ((value.trim() === "" ? null : Number(value)) === original) return;
    const fd = new FormData();
    fd.set("itemId", String(itemId));
    fd.set(field, value);
    startTransition(async () => {
      await updateItemPrice(fd);
      setSaved(field);
    });
  };

  const cell = (field: "unitPrice" | "sellPrice", value: string, set: (v: string) => void, original: number | null, label: string) => {
    const amount = value.trim() === "" ? null : Number(value) * (quantity ?? 1);
    return (
      <td className="px-3 py-3 align-top">
        <input
          type="number"
          step="0.01"
          min={0}
          value={value}
          onChange={(e) => set(e.target.value)}
          onBlur={() => save(field, value, original)}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), e.currentTarget.blur())}
          disabled={pending}
          aria-label={label}
          className="input py-1 text-right text-sm"
        />
        <p className="mt-1 text-right text-xs text-gray-500">
          {saved === field ? <span className="font-medium text-green-700">✓ บันทึกแล้ว</span> : amount != null && !Number.isNaN(amount) ? `รวม ${fmt(amount)}` : " "}
        </p>
      </td>
    );
  };

  return (
    <>
      {cell("unitPrice", buy, setBuy, unitPrice, "ราคาซื้อต่อหน่วย")}
      {cell("sellPrice", sell, setSell, sellPrice, "ราคาขายต่อหน่วย")}
    </>
  );
}
