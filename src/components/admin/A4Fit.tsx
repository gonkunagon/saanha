"use client";

import { useEffect } from "react";

// หน้าเอกสาร A4 (ใบเสร็จ / ใบเสนอราคา / ใบสรุปค่าขนส่ง) บนจอแคบ: ย่อทั้งแผ่นให้พอดีความกว้างจอ แทนที่จะบีบตัวหนังสือ
// ตั้งค่า --a4-zoom ให้ <article class="a4"> (CSS ใน globals.css) — ตอนพิมพ์ใช้ขนาดจริงเสมอ
export function A4Fit() {
  useEffect(() => {
    const A4_PX = 794; // 210mm ที่ 96dpi
    const fit = () => {
      const zoom = Math.min(1, (window.innerWidth - 32) / A4_PX);
      document.documentElement.style.setProperty("--a4-zoom", String(zoom));
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);
  return null;
}
