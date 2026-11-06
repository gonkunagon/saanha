"use client";

import { useState } from "react";

// ช่อง Tracking no. จีน → ไทย หลายช่อง (1 ออเดอร์มีได้หลายพัสดุ) — ทุกช่องส่งชื่อ intlTrackingNo
export function TrackingFields({ defaults }: { defaults: string[] }) {
  const [rows, setRows] = useState(() => (defaults.length ? defaults : [""]).map((v, i) => ({ id: i, v })));
  const [nextId, setNextId] = useState(rows.length);

  return (
    <div className="space-y-2">
      {rows.map((r, i) => (
        <div key={r.id} className="flex gap-2">
          {/* .input กว้างเต็มช่องเสมอ จึงคุมความกว้างด้วย span ที่ครอบ */}
          <span className="w-full max-w-xs">
            <input
              name="intlTrackingNo"
              defaultValue={r.v}
              placeholder={`Tracking no. ${i + 1}`}
              className="input"
              autoComplete="off"
            />
          </span>
          {rows.length > 1 && (
            <button
              type="button"
              onClick={() => setRows(rows.filter((x) => x.id !== r.id))}
              aria-label={`ลบ Tracking no. ${i + 1}`}
              className="shrink-0 px-2 text-gray-400 hover:text-brand-600"
            >
              ✕
            </button>
          )}
        </div>
      ))}
      <button
        type="button"
        onClick={() => {
          setRows([...rows, { id: nextId, v: "" }]);
          setNextId(nextId + 1);
        }}
        className="text-sm font-medium text-brand-600 hover:underline"
      >
        + เพิ่ม Tracking no.
      </button>
    </div>
  );
}
