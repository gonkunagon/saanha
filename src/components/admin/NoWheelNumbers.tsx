"use client";

import { useEffect } from "react";

// ช่องตัวเลข (input type=number) ไม่ให้ค่าเปลี่ยนเมื่อเลื่อนลูกกลิ้งเมาส์ —
// เลื่อนเมาส์ขณะอยู่ในช่องที่กำลังพิมพ์ = ออกจากช่อง แล้วหน้าเลื่อนตามปกติ
export function NoWheelNumbers() {
  useEffect(() => {
    const onWheel = (e: WheelEvent) => {
      const el = document.activeElement;
      if (el instanceof HTMLInputElement && el.type === "number" && e.target === el) el.blur();
    };
    document.addEventListener("wheel", onWheel, { passive: true });
    return () => document.removeEventListener("wheel", onWheel);
  }, []);
  return null;
}
