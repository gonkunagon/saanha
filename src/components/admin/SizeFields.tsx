"use client";

import { useState } from "react";
import { calcCbm } from "@/lib/cbm";

type Defaults = {
  boxes?: number | null;
  weightKg?: number | null;
  widthCm?: number | null;
  lengthCm?: number | null;
  heightCm?: number | null;
};

// ช่องกล่อง น้ำหนัก และขนาด กว้าง × ยาว × สูง พร้อมแสดงคิวที่คำนวณให้ทันที
// prefix: ใช้ "item" ในฟอร์มสร้างออเดอร์ (มีหลายแถว ชื่อช่องเป็น itemBoxes, itemWidthCm, ...)
export function SizeFields({ prefix = "", defaults = {} }: { prefix?: string; defaults?: Defaults }) {
  const name = (n: string) => (prefix ? `${prefix}${n[0].toUpperCase()}${n.slice(1)}` : n);
  const str = (v?: number | null) => (v == null ? "" : String(v));

  const [boxes, setBoxes] = useState(str(defaults.boxes));
  const [w, setW] = useState(str(defaults.widthCm));
  const [l, setL] = useState(str(defaults.lengthCm));
  const [h, setH] = useState(str(defaults.heightCm));
  const cbm = calcCbm(Number(w) || null, Number(l) || null, Number(h) || null, Number(boxes) || null);

  const box = "input px-2 text-center";
  return (
    <div className="flex flex-wrap items-end gap-2">
      <label className="w-20">
        <span className="mb-1 block text-xs text-gray-500">กล่อง</span>
        <input name={name("boxes")} type="number" min={0} value={boxes} onChange={(e) => setBoxes(e.target.value)} className={box} />
      </label>
      <label className="w-24">
        <span className="mb-1 block text-xs text-gray-500">น้ำหนักรวม (กก.)</span>
        <input name={name("weightKg")} type="number" step="0.01" min={0} defaultValue={str(defaults.weightKg)} className={box} />
      </label>
      <div>
        <span className="mb-1 block text-xs text-gray-500">ขนาดต่อกล่อง กว้าง × ยาว × สูง (ซม.)</span>
        {/* .input กว้างเต็มช่องเสมอ จึงคุมความกว้างด้วย span ที่ครอบ */}
        <div className="flex items-center gap-1">
          <span className="w-20">
            <input name={name("widthCm")} type="number" step="0.1" min={0} placeholder="กว้าง" value={w} onChange={(e) => setW(e.target.value)} className={box} aria-label="กว้าง (ซม.)" />
          </span>
          <span className="text-gray-400">×</span>
          <span className="w-20">
            <input name={name("lengthCm")} type="number" step="0.1" min={0} placeholder="ยาว" value={l} onChange={(e) => setL(e.target.value)} className={box} aria-label="ยาว (ซม.)" />
          </span>
          <span className="text-gray-400">×</span>
          <span className="w-20">
            <input name={name("heightCm")} type="number" step="0.1" min={0} placeholder="สูง" value={h} onChange={(e) => setH(e.target.value)} className={box} aria-label="สูง (ซม.)" />
          </span>
        </div>
      </div>
      <div className="pb-2 text-sm">
        = <span className="font-semibold text-brand-700">{cbm != null ? cbm.toFixed(4) : "–"}</span> คิว
      </div>
    </div>
  );
}
