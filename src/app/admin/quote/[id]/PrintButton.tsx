"use client";

import { useState } from "react";

// ปุ่ม "บันทึกเป็น PDF": แปลงเอกสาร A4 (<article class="a4"> ทุกแผ่นในหน้า) เป็นไฟล์ PDF แล้วดาวน์โหลดเลย ไม่ต้องผ่านหน้าพิมพ์
// แต่ละแผ่น = 1 หน้า A4 (ยาวเกินหน้าก็ย่อให้พอดี 1 หน้า)
export function PrintButton({ fileName = "document" }: { fileName?: string }) {
  const [busy, setBusy] = useState(false);
  // iPhone: ไฟล์ที่สร้างแล้ว แต่เปิดหน้าแชร์ไม่ได้ (ต้องแตะอีกครั้ง) — แสดงปุ่ม "แชร์ / บันทึกไฟล์"
  const [ready, setReady] = useState<File | null>(null);

  // มือถือที่แชร์ไฟล์ได้ (iPhone / Android) = เปิดหน้าแชร์ (มี "บันทึกไปยังไฟล์") · คอม = ดาวน์โหลดตรง
  const canShareFile = (file: File) => /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) && !!navigator.canShare?.({ files: [file] });
  async function share(file: File) {
    try {
      await navigator.share({ files: [file], title: file.name });
      setReady(null);
    } catch (err) {
      if ((err as Error).name === "AbortError") setReady(null); // ผู้ใช้ปิดหน้าแชร์เอง
      else setReady(file); // หมดสิทธิ์ user gesture (สร้างไฟล์นานเกิน) — ให้แตะปุ่มอีกครั้ง
    }
  }

  async function savePdf() {
    setBusy(true);
    const root = document.documentElement;
    const zoom = root.style.getPropertyValue("--a4-zoom");
    try {
      const [{ toJpeg }, { jsPDF }] = await Promise.all([import("html-to-image"), import("jspdf")]);
      root.style.setProperty("--a4-zoom", "1"); // ถ่ายภาพขนาดจริง (บนมือถือแผ่นถูกย่ออยู่)
      const pages = [...document.querySelectorAll<HTMLElement>("article.a4")];
      const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait", compress: true });
      for (const [n, page] of pages.entries()) {
        // JPEG คมพอพิมพ์ ไฟล์เล็ก (PNG ได้ไฟล์ ~14MB)
        const img = await toJpeg(page, { pixelRatio: 2, quality: 0.9, backgroundColor: "#ffffff", style: { boxShadow: "none", margin: "0" } });
        const { width, height } = page.getBoundingClientRect();
        // กว้างเต็ม 210 มม. · สูงเกิน 297 มม. = ย่อทั้งภาพให้พอดีหน้า (จัดกึ่งกลาง)
        let w = 210;
        let h = (height / width) * w;
        if (h > 297) {
          w = (297 / h) * w;
          h = 297;
        }
        if (n > 0) pdf.addPage();
        pdf.addImage(img, "JPEG", (210 - w) / 2, 0, w, h);
      }
      const file = new File([pdf.output("blob")], `${fileName}.pdf`, { type: "application/pdf" });
      if (canShareFile(file)) await share(file);
      else pdf.save(`${fileName}.pdf`);
    } catch (err) {
      console.error(err);
      alert("สร้างไฟล์ PDF ไม่สำเร็จ — ลองใหม่อีกครั้ง หรือใช้เมนูพิมพ์ของเบราว์เซอร์");
    } finally {
      if (zoom) root.style.setProperty("--a4-zoom", zoom);
      setBusy(false);
    }
  }

  if (ready) {
    return (
      <button type="button" onClick={() => share(ready)} className="btn-primary">
        📤 แชร์ / บันทึกไฟล์ PDF
      </button>
    );
  }
  return (
    <button type="button" onClick={savePdf} disabled={busy} className="btn-primary disabled:opacity-60">
      {busy ? "กำลังสร้าง PDF..." : "บันทึกเป็น PDF"}
    </button>
  );
}
