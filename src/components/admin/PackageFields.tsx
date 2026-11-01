"use client";

import { useState } from "react";
import { calcCbm } from "@/lib/cbm";
import { lookupJjParcels } from "@/app/admin/(panel)/orders/jj-actions";

export type PackageInput = {
  importKey?: string | null; // พัสดุที่มาจาก JJ — ส่งคืนตอนบันทึก กันซิงค์สร้างซ้ำ
  chinaTrackingNo?: string | null;
  boxes?: number | null;
  weightKg?: number | null;
  widthCm?: number | null;
  lengthCm?: number | null;
  heightCm?: number | null;
};

// auto = เลขพัสดุจีนของแถวนี้ให้ระบบตั้งให้ (ตามแถวแรก) จนกว่าพนักงานจะพิมพ์เอง
type Row = {
  key: number;
  importKey: string;
  tracking: string;
  auto: boolean;
  boxes: string;
  weight: string;
  w: string;
  l: string;
  h: string;
};

const str = (v?: number | string | null) => (v == null ? "" : String(v));
const toRow = (p: PackageInput, key: number): Row => ({
  key,
  importKey: str(p.importKey),
  tracking: str(p.chinaTrackingNo),
  auto: !p.chinaTrackingNo,
  boxes: str(p.boxes),
  weight: str(p.weightKg),
  w: str(p.widthCm),
  l: str(p.lengthCm),
  h: str(p.heightCm),
});
const rowCbm = (r: Row) => calcCbm(Number(r.w) || null, Number(r.l) || null, Number(r.h) || null, Number(r.boxes) || null);

// เลขพัสดุจีนของแถวที่ระบบตั้งให้ = เลขแถวแรก + "-ลำดับ" เช่น 0010883 → 0010883-1, 0010883-2
function autoNumber(rows: Row[]): Row[] {
  const base = rows[0]?.tracking.trim() ?? "";
  return rows.map((r, i) => (i > 0 && r.auto ? { ...r, tracking: base ? `${base}-${i}` : "" } : r));
}

// พัสดุย่อยของรายการสินค้า: เพิ่มได้หลายแถว แต่ละแถว = กล่องขนาดเดียวกัน
// prefix: ชื่อช่อง เช่น "pkg_" (ฟอร์มรายการเดียว) หรือ "pkg_3_" (แถวที่ 3 ในฟอร์มสร้างออเดอร์)
export function PackageFields({ prefix = "pkg_", defaults = [] }: { prefix?: string; defaults?: PackageInput[] }) {
  const [rows, setRows] = useState<Row[]>(() => (defaults.length ? defaults : [{}]).map(toRow));
  const [nextKey, setNextKey] = useState(rows.length);

  const update = (key: number, field: keyof Omit<Row, "key" | "auto">, value: string) =>
    setRows((rs) => {
      const next = rs.map((r) => {
        if (r.key !== key) return r;
        // พิมพ์เลขพัสดุเองในแถวที่ 2 ขึ้นไป = เลิกตั้งอัตโนมัติ (ลบจนว่าง = กลับมาตั้งอัตโนมัติ)
        if (field === "tracking") return { ...r, tracking: value, auto: value.trim() === "" };
        return { ...r, [field]: value };
      });
      return field === "tracking" && rs[0]?.key === key ? autoNumber(next) : next;
    });
  const addRow = () => {
    setRows((rs) => autoNumber([...rs, toRow({}, nextKey)]));
    setNextKey((k) => k + 1);
  };
  const removeRow = (key: number) => setRows((rs) => (rs.length > 1 ? autoNumber(rs.filter((r) => r.key !== key)) : rs));

  // ดึงข้อมูลจาก JJ Cargo: แทนแถวนี้ด้วยพัสดุทุกกล่องของเลขนั้น (1 กล่อง = 1 แถว)
  const [fetchingKey, setFetchingKey] = useState<number | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const fetchFromJj = async (row: Row) => {
    setFetchingKey(row.key);
    setMessage(null);
    const result = await lookupJjParcels(row.tracking);
    setFetchingKey(null);
    if (!result.ok) return setMessage({ ok: false, text: result.error });

    const base = row.tracking.trim();
    const fetched: Row[] = result.parcels.map((p, i) => ({
      ...toRow({ boxes: 1, weightKg: p.weightKg, widthCm: p.widthCm, lengthCm: p.lengthCm, heightCm: p.heightCm }, nextKey + i),
      tracking: i === 0 ? base : `${base}-${i}`,
      auto: false,
    }));
    setNextKey((k) => k + fetched.length);
    setRows((rs) => {
      const at = rs.findIndex((r) => r.key === row.key);
      return autoNumber([...rs.slice(0, at), ...fetched, ...rs.slice(at + 1)]);
    });
    const first = result.parcels[0];
    setMessage({
      ok: true,
      text:
        `ดึงข้อมูล ${base} จาก JJ Cargo แล้ว ${fetched.length} กล่อง` +
        (first.shipmentCode ? ` · รอบขนส่ง ${first.shipmentCode}` : "") +
        (first.offChinaDate ? ` · ออกจากจีน ${first.offChinaDate}` : ""),
    });
  };

  const totalBoxes = rows.reduce((s, r) => s + (Number(r.boxes) || 0), 0);
  const totalWeight = rows.reduce((s, r) => s + (Number(r.weight) || 0), 0);
  const totalCbm = rows.reduce((s, r) => s + (rowCbm(r) ?? 0), 0);

  const cell = "input px-2 text-center";
  return (
    <div className="rounded-lg border border-dashed border-gray-300 p-3">
      <div className="mb-1 hidden gap-2 text-xs text-gray-500 md:grid md:grid-cols-[13rem_4.5rem_5.5rem_auto_6rem_1.5rem]">
        <span>เลขพัสดุจีน</span>
        <span>กล่อง</span>
        <span>น้ำหนัก (กก.)</span>
        <span>ขนาดต่อกล่อง กว้าง × ยาว × สูง (ซม.)</span>
        <span className="text-right">คิว</span>
        <span />
      </div>
      <div className="space-y-2">
        {rows.map((r, i) => {
          const cbm = rowCbm(r);
          return (
            <div key={r.key} className="grid grid-cols-2 items-center gap-2 md:grid-cols-[13rem_4.5rem_5.5rem_auto_6rem_1.5rem]">
              <div className="col-span-2 flex gap-1 md:col-span-1">
                <input type="hidden" name={`${prefix}importKey`} value={r.importKey} />
                <input name={`${prefix}chinaTrackingNo`} value={r.tracking} onChange={(e) => update(r.key, "tracking", e.target.value)} placeholder={`พัสดุจีน ${i + 1}`} className="input" />
                <button
                  type="button"
                  onClick={() => fetchFromJj(r)}
                  disabled={!r.tracking.trim() || fetchingKey !== null}
                  title="ดึงกล่อง น้ำหนัก ขนาด จาก JJ Cargo"
                  className="shrink-0 rounded-lg border border-brand-200 px-2 text-xs font-medium text-brand-700 hover:bg-brand-50 disabled:opacity-40"
                >
                  {fetchingKey === r.key ? "…" : "ดึง"}
                </button>
              </div>
              <input name={`${prefix}boxes`} type="number" min={0} value={r.boxes} onChange={(e) => update(r.key, "boxes", e.target.value)} placeholder="กล่อง" className={cell} aria-label="จำนวนกล่อง" />
              <input name={`${prefix}weightKg`} type="number" step="0.01" min={0} value={r.weight} onChange={(e) => update(r.key, "weight", e.target.value)} placeholder="กก." className={cell} aria-label="น้ำหนัก (กก.)" />
              {/* .input กว้างเต็มช่องเสมอ จึงคุมความกว้างด้วย span ที่ครอบ */}
              <div className="col-span-2 flex items-center gap-1 md:col-span-1">
                <span className="w-16"><input name={`${prefix}widthCm`} type="number" step="0.1" min={0} value={r.w} onChange={(e) => update(r.key, "w", e.target.value)} placeholder="กว้าง" className={cell} aria-label="กว้าง (ซม.)" /></span>
                <span className="text-gray-400">×</span>
                <span className="w-16"><input name={`${prefix}lengthCm`} type="number" step="0.1" min={0} value={r.l} onChange={(e) => update(r.key, "l", e.target.value)} placeholder="ยาว" className={cell} aria-label="ยาว (ซม.)" /></span>
                <span className="text-gray-400">×</span>
                <span className="w-16"><input name={`${prefix}heightCm`} type="number" step="0.1" min={0} value={r.h} onChange={(e) => update(r.key, "h", e.target.value)} placeholder="สูง" className={cell} aria-label="สูง (ซม.)" /></span>
              </div>
              <span className="text-sm md:text-right">{cbm != null ? cbm.toFixed(4) : "–"} คิว</span>
              <button
                type="button"
                onClick={() => removeRow(r.key)}
                disabled={rows.length === 1}
                className="text-gray-400 hover:text-brand-600 disabled:invisible"
                aria-label="ลบพัสดุแถวนี้"
              >
                ✕
              </button>
            </div>
          );
        })}
      </div>
      {message && (
        <p className={`mt-2 text-sm ${message.ok ? "text-emerald-700" : "text-brand-700"}`}>{message.text}</p>
      )}
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-sm">
        <button type="button" onClick={addRow} className="font-medium text-brand-600 hover:underline">
          + เพิ่มพัสดุ / ขนาดอื่น
        </button>
        <span className="text-gray-600">
          รวม <b>{totalBoxes}</b> กล่อง · <b>{Math.round(totalWeight * 100) / 100}</b> กก. ·{" "}
          <b className="text-brand-700">{totalCbm.toFixed(4)}</b> คิว
        </span>
      </div>
    </div>
  );
}
