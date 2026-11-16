"use client";

import { startTransition, useActionState, useState } from "react";
import Link from "next/link";
import { stageIndex, stageLabelsTh, type ItemStage } from "@/lib/stages";
import { applyStage } from "../actions";

export type ContainerOption = { code: string; label: string };

// สถานะที่อัปเดตจากหน้าออเดอร์ได้ = ขั้นของรายการสินค้าเท่านั้น
// ขั้นของตู้ (ปิดตู้ → ถึงโกดังไทย) และการเข้าตู้ จัดการที่หน้าตู้อย่างเดียว
export const ORDER_PAGE_STAGES: ItemStage[] = ["in_production", "china_warehouse", "out_for_delivery", "delivered"];

type Props = {
  formId: string;
  orderId: number;
  defaultStage: ItemStage;
  defaultAt: string;
  containers: { id: number; code: string }[]; // ตู้ของออเดอร์นี้ (ลิงก์ไปอัปเดตที่หน้าตู้)
};

// แถบอัปเดตสถานะ: เลือกรายการ (checkbox ในรายการด้านบน) → เลือกสถานะ → บันทึก
export function StageUpdateForm({ formId, orderId, defaultStage, defaultAt, containers }: Props) {
  const [error, action, pending] = useActionState(applyStage, null);
  // ขั้นถัดไปเป็นขั้นของตู้ = ตั้งต้นที่ขั้นของรายการที่ใกล้ที่สุด
  const initial = ORDER_PAGE_STAGES.includes(defaultStage)
    ? defaultStage
    : stageIndex(defaultStage) < stageIndex("loaded")
      ? "china_warehouse"
      : "out_for_delivery";
  const [stage, setStage] = useState<ItemStage>(initial);
  const needsDomestic = stageIndex(stage) >= stageIndex("out_for_delivery");

  const toggleAll = (checked: boolean) =>
    document
      .querySelectorAll<HTMLInputElement>(`input[type=checkbox][form="${formId}"]`)
      .forEach((cb) => (cb.checked = checked));

  return (
    // ส่งเองผ่าน onSubmit แทน action={...} เพราะ React จะล้างฟอร์มหลังส่งทุกครั้ง
    // ถ้ามี error พนักงานจะต้องเลือกรายการ/กรอกใหม่หมด
    <form
      id={formId}
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        startTransition(() => action(fd));
      }}
      className="rounded-xl bg-brand-50 p-4 ring-1 ring-brand-100"
    >
      <input type="hidden" name="orderId" value={orderId} />
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="font-semibold text-brand-800">อัปเดตสถานะรายการที่เลือก</p>
        <span className="flex gap-3 text-sm">
          <button type="button" onClick={() => toggleAll(true)} className="text-brand-600 hover:underline">เลือกทั้งหมด</button>
          <button type="button" onClick={() => toggleAll(false)} className="text-gray-500 hover:underline">ไม่เลือก</button>
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:items-end">
        <label className="block">
          <span className="mb-1 block text-sm text-gray-600">สถานะใหม่</span>
          <select name="stage" value={stage} onChange={(e) => setStage(e.target.value as ItemStage)} className="input bg-white">
            {ORDER_PAGE_STAGES.map((s) => (
              <option key={s} value={s}>{stageLabelsTh[s]}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-sm text-gray-600">วันเวลา</span>
          <input type="datetime-local" name="at" required defaultValue={defaultAt} className="input bg-white" />
        </label>
        {needsDomestic && (
          <label className="block">
            <span className="mb-1 block text-sm text-gray-600">เลขพัสดุขนส่งในไทย</span>
            <input name="domesticTracking" className="input bg-white" />
          </label>
        )}
        <button disabled={pending} className="btn-primary">{pending ? "กำลังบันทึก..." : "บันทึกสถานะ"}</button>
      </div>

      <p className="mt-3 text-xs text-gray-600">
        ℹ️ สถานะของตู้ (ปิดตู้ / ออกจากจีน / ถึงด่าน / ถึงโกดังไทย) และการนำสินค้าเข้าตู้ อัปเดตที่หน้าตู้
        {containers.length > 0 && (
          <>
            {" "}·{" "}
            {containers.map((c, n) => (
              <span key={c.id}>
                {n > 0 && ", "}
                <Link href={`/admin/containers/${c.id}`} className="font-medium text-brand-700 hover:underline">{c.code}</Link>
              </span>
            ))}
          </>
        )}
      </p>
      {error && <p className="mt-3 text-sm font-medium text-brand-700">{error}</p>}
    </form>
  );
}
