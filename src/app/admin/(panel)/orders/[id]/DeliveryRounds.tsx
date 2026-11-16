"use client";

import { useState, useTransition } from "react";
import { saveDeliveryRounds, setRoundDelivered, type RoundInput } from "../round-actions";

type Item = { id: number; description: string; quantity: number | null };

const thaiDate = (d: string | null) =>
  d ? new Date(`${d}T00:00:00`).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" }) : "ยังไม่ระบุวัน";

// แยกรอบส่ง: ปุ่มเดียวต่อออเดอร์ · เพิ่มรอบ 1, 2, 3, ... แต่ละรอบใส่วันที่จัดส่ง + จำนวนของแต่ละรายการ
// รวมทุกรอบห้ามเกินจำนวนที่มี (ตรวจทั้งที่นี่และฝั่งเซิร์ฟเวอร์)
export function DeliveryRounds({ orderId, items, saved }: { orderId: number; items: Item[]; saved: RoundInput[] }) {
  const [editing, setEditing] = useState(false);
  const [rounds, setRounds] = useState<RoundInput[]>(saved);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const key = (i: Item) => String(i.id);
  const used = (i: Item, except?: number) => rounds.reduce((s, r, n) => s + (n === except ? 0 : (r.qty[key(i)] ?? 0)), 0);
  const left = (i: Item, list = rounds) =>
    i.quantity == null ? null : i.quantity - list.reduce((s, r) => s + (r.qty[key(i)] ?? 0), 0);
  const over = items.filter((i) => (left(i) ?? 0) < 0);

  const setQty = (n: number, i: Item, v: string) =>
    setRounds((rs) => rs.map((r, k) => (k === n ? { ...r, qty: { ...r.qty, [key(i)]: Math.max(0, Math.floor(Number(v) || 0)) } } : r)));
  const setDate = (n: number, v: string) => setRounds((rs) => rs.map((r, k) => (k === n ? { ...r, date: v } : r)));
  // ใส่ที่เหลือทั้งหมดในรอบนี้ (ไม่ต้องกรอกทีละรายการ)
  const fillRest = (n: number) =>
    setRounds((rs) =>
      rs.map((r, k) =>
        k === n
          ? { ...r, qty: Object.fromEntries(items.map((i) => [key(i), i.quantity == null ? (r.qty[key(i)] ?? 0) : Math.max(0, i.quantity - used(i, n))])) }
          : r,
      ),
    );
  const addRound = () => setRounds((rs) => [...rs, { date: "", qty: {} }]);
  const removeRound = (n: number) => setRounds((rs) => rs.filter((_, k) => k !== n));

  const save = () =>
    start(async () => {
      const err = await saveDeliveryRounds(orderId, rounds);
      setError(err);
      if (!err) setEditing(false);
    });
  // ยืนยันส่งรอบนี้แล้ว → ระบบอัปเดตสถานะจัดส่งของรายการให้ (ครบจำนวน = จัดส่งสำเร็จ · บางส่วน = กำลังจัดส่ง)
  const markDelivered = (n: number, r: RoundInput, on: boolean) => {
    const msg = on
      ? `ยืนยันว่าส่งรอบ ${n + 1} แล้ว?
สถานะของรายการในรอบนี้จะอัปเดตให้อัตโนมัติ`
      : `ยกเลิกการยืนยันส่งรอบ ${n + 1}?
สถานะจัดส่งของรายการจะถูกคำนวณใหม่`;
    if (!window.confirm(msg)) return;
    // วันที่ส่ง = วันที่จัดส่งของรอบ (ถ้าใส่ไว้ และไม่ใช่วันในอนาคต) ไม่งั้น = ตอนนี้
    const planned = r.date ? new Date(`${r.date}T12:00:00`) : null;
    const at = on ? (planned && planned.getTime() <= Date.now() ? planned : new Date()).toISOString() : null;
    start(async () => setError(await setRoundDelivered(orderId, n + 1, at)));
  };
  const cancel = () => {
    setRounds(saved);
    setError(null);
    setEditing(false);
  };

  // ยังไม่แยก + ไม่ได้แก้ = ปุ่มเดียว
  if (!editing && saved.length === 0) {
    return (
      <button
        type="button"
        onClick={() => {
          setRounds([
            { date: "", qty: {} },
            { date: "", qty: {} },
          ]);
          setEditing(true);
        }}
        className="mt-3 rounded-lg border border-brand-600 px-3 py-1 text-xs font-medium text-brand-600 hover:bg-brand-50"
      >
        🚚 แยกรอบส่ง
      </button>
    );
  }

  const shown = editing ? rounds : saved;
  return (
    <div className="mt-3 rounded-lg border border-gray-200 p-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-gray-800">🚚 รอบจัดส่ง ({shown.length} รอบ)</p>
        {!editing && error && <span className="text-sm text-brand-700">{error}</span>}
        {!editing && (
          <button
            type="button"
            onClick={() => {
              setRounds(saved);
              setEditing(true);
            }}
            className="rounded-lg border border-brand-600 px-3 py-1 text-xs font-medium text-brand-600 hover:bg-brand-50"
          >
            ✏️ แก้ไขรอบส่ง
          </button>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-max text-sm">
          <thead>
            <tr className="border-b border-gray-200 align-bottom text-xs text-gray-500">
              <th className="py-2 pr-3 text-left font-normal">สินค้า</th>
              <th className="px-2 py-2 text-right font-normal">ทั้งหมด</th>
              {shown.map((r, n) => (
                <th key={n} className="px-2 py-2 text-center font-normal">
                  <div className="flex items-center justify-center gap-1 font-semibold text-gray-800">
                    รอบ {n + 1}
                    {editing && (
                      <button type="button" onClick={() => removeRound(n)} className="text-gray-400 hover:text-brand-600" aria-label={`ลบรอบ ${n + 1}`}>
                        ✕
                      </button>
                    )}
                  </div>
                  {editing ? (
                    <>
                      {r.deliveredAt && <div className="text-[11px] font-medium text-emerald-700">✅ ส่งแล้ว</div>}
                      <input
                        type="date"
                        value={r.date}
                        onChange={(e) => setDate(n, e.target.value)}
                        className="input mt-1 w-36 px-2 py-1 text-xs"
                        aria-label={`วันที่จัดส่งรอบ ${n + 1}`}
                      />
                      <button type="button" onClick={() => fillRest(n)} className="mt-1 block w-full text-[11px] text-brand-600 hover:underline">
                        ใส่ที่เหลือทั้งหมด
                      </button>
                    </>
                  ) : (
                    <>
                      <div>{thaiDate(r.date || null)}</div>
                      {r.deliveredAt ? (
                        <div className="mt-1 text-[11px] font-medium text-emerald-700">
                          ✅ ส่งแล้ว{" "}
                          <button type="button" disabled={pending} onClick={() => markDelivered(n, r, false)} className="font-normal text-gray-400 hover:text-brand-600 hover:underline">
                            ยกเลิก
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => markDelivered(n, r, true)}
                          className="mt-1 rounded-md border border-emerald-600 px-2 py-0.5 text-[11px] font-medium text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
                        >
                          ยืนยันส่งรอบนี้แล้ว
                        </button>
                      )}
                    </>
                  )}
                </th>
              ))}
              <th className="py-2 pl-2 text-right font-normal">เหลือ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {items.map((i) => {
              const rest = left(i, shown);
              return (
                <tr key={i.id}>
                  <td className="max-w-64 py-1.5 pr-3">{i.description}</td>
                  <td className="px-2 py-1.5 text-right">{i.quantity ?? "-"}</td>
                  {shown.map((r, n) => (
                    <td key={n} className="px-2 py-1.5 text-center">
                      {editing ? (
                        <input
                          type="number"
                          min={0}
                          value={r.qty[key(i)] || ""}
                          onChange={(e) => setQty(n, i, e.target.value)}
                          placeholder="0"
                          className={`input w-20 px-2 py-1 text-center ${rest != null && rest < 0 ? "ring-2 ring-brand-500" : ""}`}
                          aria-label={`${i.description} รอบ ${n + 1}`}
                        />
                      ) : (
                        r.qty[key(i)] || "-"
                      )}
                    </td>
                  ))}
                  <td
                    className={`py-1.5 pl-2 text-right font-medium ${rest != null && rest < 0 ? "text-brand-700" : rest === 0 ? "text-emerald-700" : "text-gray-600"}`}
                  >
                    {rest ?? "-"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {editing && (
        <>
          {over.length > 0 && (
            <p className="mt-2 text-sm text-brand-700">⚠️ รวมทุกรอบเกินจำนวนที่มี: {over.map((i) => i.description).join(", ")}</p>
          )}
          {error && <p className="mt-2 text-sm text-brand-700">{error}</p>}
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button type="button" onClick={addRound} className="text-sm font-medium text-brand-600 hover:underline">
              + เพิ่มรอบ
            </button>
            <button type="button" onClick={save} disabled={pending || over.length > 0} className="btn-primary disabled:opacity-50">
              {pending ? "กำลังบันทึก..." : "บันทึกรอบส่ง"}
            </button>
            <button type="button" onClick={cancel} className="text-sm text-gray-500 hover:underline">
              ยกเลิก
            </button>
          </div>
        </>
      )}
    </div>
  );
}
