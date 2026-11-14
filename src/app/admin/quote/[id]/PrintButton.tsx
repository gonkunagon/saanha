"use client";

import { useState } from "react";

// ปุ่ม "บันทึกเป็น PDF": แปลงเอกสาร A4 (<article class="a4"> ทุกแผ่นในหน้า) เป็นไฟล์ PDF แล้วดาวน์โหลดเลย ไม่ต้องผ่านหน้าพิมพ์
// แต่ละแผ่น = 1 หน้า A4 (ยาวเกินหน้าก็ย่อให้พอดี 1 หน้า)
export function PrintButton({ fileName = "document" }: { fileName?: string }) {
  const [busy, setBusy] = useState(false);

  async function savePdf() {
    setBusy(true);
    const root = document.documentElement;
    const zoom = root.style.getPropertyValue("--a4-zoom");
    try {
      const [{ toPng }, { jsPDF }] = await Promise.all([import("html-to-image"), import("jspdf")]);
      root.style.setProperty("--a4-zoom", "1"); // ถ่ายภาพขนาดจริง (บนมือถือแผ่นถูกย่ออยู่)
      const pages = [...document.querySelectorAll<HTMLElement>("article.a4")];
      const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
      for (const [n, page] of pages.entries()) {
        const png = await toPng(page, { pixelRatio: 2, backgroundColor: "#ffffff", style: { boxShadow: "none", margin: "0" } });
        const { width, height } = page.getBoundingClientRect();
        // กว้างเต็ม 210 มม. · สูงเกิน 297 มม. = ย่อทั้งภาพให้พอดีหน้า (จัดกึ่งกลาง)
        let w = 210;
        let h = (height / width) * w;
        if (h > 297) {
          w = (297 / h) * w;
          h = 297;
        }
        if (n > 0) pdf.addPage();
        pdf.addImage(png, "PNG", (210 - w) / 2, 0, w, h);
      }
      pdf.save(`${fileName}.pdf`);
    } catch (err) {
      console.error(err);
      alert("สร้างไฟล์ PDF ไม่สำเร็จ — ลองใหม่อีกครั้ง หรือใช้เมนูพิมพ์ของเบราว์เซอร์");
    } finally {
      if (zoom) root.style.setProperty("--a4-zoom", zoom);
      setBusy(false);
    }
  }

  return (
    <button type="button" onClick={savePdf} disabled={busy} className="btn-primary disabled:opacity-60">
      {busy ? "กำลังสร้าง PDF..." : "บันทึกเป็น PDF"}
    </button>
  );
}
