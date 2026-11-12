"use client";

import { useEffect, useState } from "react";

// แจ้ง "แก้ไขเสร็จสิ้น" หลังบันทึกฟอร์มแก้ไขออเดอร์ (?saved=1) — หายเองใน 5 วินาที และลบ ?saved ออกจาก URL กันขึ้นซ้ำตอนรีเฟรช
export function SavedNotice() {
  const [show, setShow] = useState(true);
  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.delete("saved");
    window.history.replaceState(window.history.state, "", url);
    const t = setTimeout(() => setShow(false), 5000);
    return () => clearTimeout(t);
  }, []);
  if (!show) return null;
  return (
    <p role="status" className="mt-3 flex items-center justify-between rounded-lg bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800 ring-1 ring-emerald-200">
      ✓ แก้ไขเสร็จสิ้น
      <button type="button" onClick={() => setShow(false)} className="text-emerald-700 hover:text-emerald-900" aria-label="ปิด">✕</button>
    </p>
  );
}
