"use client";

import { startTransition, useActionState, useState, useTransition } from "react";
import { deleteExtraCharge, saveExtraCharge } from "../extra-actions";

export type ExtraRow = { id: number; containerId: number | null; description: string; charge: number | null; cost: number | null };
type Box = { id: number; code: string };

const baht = (n: number) => `${n.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท`;

function ExtraForm({ orderId, boxes, row, onDone }: { orderId: number; boxes: Box[]; row: ExtraRow | null; onDone: () => void }) {
  const [error, action, pending] = useActionState(async (prev: string | null, fd: FormData) => {
    const err = await saveExtraCharge(prev, fd);
    if (!err) onDone();
    return err;
  }, null);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        startTransition(() => action(fd));
      }}
      className="mt-2 rounded-lg bg-white/70 p-3 ring-1 ring-gray-200 [&_input]:bg-white [&_select]:bg-white [&_textarea]:bg-white"
    >
      <input type="hidden" name="orderId" value={orderId} />
      {row && <input type="hidden" name="extraId" value={row.id} />}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="block sm:col-span-2 lg:col-span-4">
          <span className="mb-1 block text-sm text-gray-600">หมายเหตุ / รายละเอียด *</span>
          <textarea name="description" rows={2} required defaultValue={row?.description ?? ""} placeholder="เช่น ค่าตีลังไม้ · ค่ายกของขึ้นชั้น 2 · ค่าส่งต่อต่างจังหวัด" className="input" />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm text-gray-600">คิดลูกค้า (บาท)</span>
          <input name="charge" type="number" step="0.01" min={0} defaultValue={row?.charge ?? ""} className="input" />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm text-gray-600">จ่ายบริษัทขนส่ง (บาท · ลูกค้าไม่เห็น)</span>
          <input name="cost" type="number" step="0.01" min={0} defaultValue={row?.cost ?? ""} className="input" />
        </label>
        {boxes.length > 1 && (
          <label className="block sm:col-span-2">
            <span className="mb-1 block text-sm text-gray-600">ใส่ในบิลค่าขนส่งของตู้</span>
            <select name="containerId" defaultValue={row?.containerId ?? ""} className="input">
              <option value="">ตู้แรก ({boxes[0].code})</option>
              {boxes.slice(1).map((b) => (
                <option key={b.id} value={b.id}>{b.code}</option>
              ))}
            </select>
          </label>
        )}
      </div>
      {error && <p className="mt-2 text-sm font-medium text-brand-700">{error}</p>}
      <div className="mt-3 flex items-center gap-3">
        <button disabled={pending} className="btn-primary disabled:opacity-50">{pending ? "กำลังบันทึก..." : "บันทึก"}</button>
        <button type="button" onClick={onDone} className="text-sm text-gray-500 hover:underline">ยกเลิก</button>
      </div>
    </form>
  );
}

// ค่าใช้จ่ายเพิ่มเติมจากการขนส่ง (ฝากส่ง) — ยอดคิดลูกค้าบวกเข้ายอดค้างชำระ + บิลค่าขนส่ง · ยอดจ่ายบริษัทขนส่งบวกเข้าต้นทุน
// bare = แสดงเป็นแถบแถวเดียว (ยังไม่มีรายการ) — ไม่มีเส้นคั่นด้านบน ไม่มีข้อความ "ยังไม่มี..."
export function ExtraCharges({ orderId, boxes, rows, bare }: { orderId: number; boxes: Box[]; rows: ExtraRow[]; bare?: boolean }) {
  const [open, setOpen] = useState<"new" | number | null>(null);
  const [pending, start] = useTransition();
  const boxCode = (id: number | null) => (boxes.length > 1 ? (boxes.find((b) => b.id === id) ?? boxes[0])?.code : null);

  return (
    <div className={bare ? "" : "mt-4 border-t border-accent-300 pt-3"}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-gray-800">ค่าใช้จ่ายเพิ่มเติม ({rows.length})</p>
        {open !== "new" && (
          <button
            type="button"
            onClick={() => setOpen("new")}
            className="inline-flex items-center gap-1 rounded-lg border border-brand-600 bg-white px-2.5 py-1 text-xs font-medium text-brand-600 hover:bg-brand-50"
          >
            + เพิ่มค่าใช้จ่าย
          </button>
        )}
      </div>
      {open === "new" && <ExtraForm orderId={orderId} boxes={boxes} row={null} onDone={() => setOpen(null)} />}
      {rows.length === 0 && open !== "new" && !bare && <p className="mt-1 text-sm text-gray-500">ยังไม่มีค่าใช้จ่ายเพิ่มเติม</p>}
      {rows.length > 0 && <ul className="mt-1 divide-y divide-accent-300/50">
        {rows.map((r) => (
          <li key={r.id} className="py-2">
            {open === r.id ? (
              <ExtraForm orderId={orderId} boxes={boxes} row={r} onDone={() => setOpen(null)} />
            ) : (
              <div className="flex flex-wrap items-start gap-x-3 gap-y-1 text-sm">
                <div className="min-w-0 flex-1">
                  <p className="whitespace-pre-line text-gray-900">{r.description}</p>
                  <p className="text-xs text-gray-500">
                    {[r.cost != null && `จ่ายบริษัทขนส่ง ${baht(r.cost)}`, boxCode(r.containerId) && `บิลตู้ ${boxCode(r.containerId)}`].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <span className="font-medium whitespace-nowrap">{r.charge != null ? `+${baht(r.charge)}` : <span className="text-xs font-normal text-gray-400">ไม่คิดลูกค้า</span>}</span>
                <span className="flex gap-2 text-xs">
                  <button type="button" onClick={() => setOpen(r.id)} className="text-brand-600 hover:underline">แก้ไข</button>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => {
                      if (window.confirm(`ลบค่าใช้จ่าย "${r.description}"?`)) start(() => deleteExtraCharge(orderId, r.id));
                    }}
                    className="text-gray-400 hover:text-brand-600 hover:underline"
                  >
                    ลบ
                  </button>
                </span>
              </div>
            )}
          </li>
        ))}
      </ul>}
    </div>
  );
}
