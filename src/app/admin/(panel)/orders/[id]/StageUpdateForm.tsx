"use client";

import { startTransition, useActionState, useState } from "react";
import { itemStages, stageIndex, stageLabelsTh, type ItemStage } from "@/lib/stages";
import { applyStage } from "../actions";

export type ContainerOption = { code: string; label: string };

type Props = {
  formId: string;
  orderId: number;
  defaultStage: ItemStage;
  defaultAt: string;
  containerOptions: ContainerOption[];
  sharedContainerNote: string | null; // เตือนเมื่อตู้มีออเดอร์อื่นอยู่ด้วย
};

const NEW = "__new__";

// แถบอัปเดตสถานะ: เลือกรายการ (checkbox ในรายการด้านบน) → เลือกสถานะ → บันทึก
export function StageUpdateForm({ formId, orderId, defaultStage, defaultAt, containerOptions, sharedContainerNote }: Props) {
  const [error, action, pending] = useActionState(applyStage, null);
  const [stage, setStage] = useState<ItemStage>(defaultStage);
  const [container, setContainer] = useState(""); // "" = ใช้ตู้เดิมของรายการ
  const needsContainer = stageIndex(stage) >= stageIndex("loaded");
  const needsDomestic = stageIndex(stage) >= stageIndex("out_for_delivery");
  const isContainerStage = needsContainer && !needsDomestic;

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
          <select
            name="stage"
            value={stage}
            onChange={(e) => setStage(e.target.value as ItemStage)}
            className="input bg-white"
          >
            {itemStages.slice(1).map((s) => (
              <option key={s} value={s}>{stageLabelsTh[s]}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-sm text-gray-600">วันเวลา</span>
          <input type="datetime-local" name="at" required defaultValue={defaultAt} className="input bg-white" />
        </label>
        {needsContainer && (
          <label className="block">
            <span className="mb-1 block text-sm text-gray-600">ตู้</span>
            <select value={container} onChange={(e) => setContainer(e.target.value)} className="input bg-white">
              <option value="">— ใช้ตู้เดิมของรายการ —</option>
              {containerOptions.map((c) => (
                <option key={c.code} value={c.code}>{c.label}</option>
              ))}
              <option value={NEW}>+ สร้างตู้ใหม่…</option>
            </select>
          </label>
        )}
        {needsDomestic && (
          <label className="block">
            <span className="mb-1 block text-sm text-gray-600">เลขพัสดุขนส่งในไทย</span>
            <input name="domesticTracking" className="input bg-white" />
          </label>
        )}
        <button disabled={pending} className="btn-primary">{pending ? "กำลังบันทึก..." : "บันทึกสถานะ"}</button>
      </div>

      {needsContainer && container === NEW ? (
        <label className="mt-3 block max-w-xs">
          <span className="mb-1 block text-sm text-gray-600">เลขตู้ใหม่</span>
          <input name="containerCode" required autoFocus placeholder="เช่น SEA-2611-01" className="input bg-white uppercase" />
        </label>
      ) : (
        <input type="hidden" name="containerCode" value={needsContainer ? container : ""} />
      )}

      {isContainerStage && sharedContainerNote && (
        <p className="mt-3 text-sm text-amber-800">⚠️ {sharedContainerNote}</p>
      )}
      {error && <p className="mt-3 text-sm font-medium text-brand-700">{error}</p>}
    </form>
  );
}
