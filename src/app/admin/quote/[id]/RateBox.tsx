"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { QuoteRate } from "@/lib/settings";
import { refreshMarketRate, saveCnyMarkup, saveManualCnyRate, resetToAutoCnyRate } from "./actions";

// กล่องเรทหยวน (บนจอเท่านั้น ไม่พิมพ์) — ปรับแล้วยอดบาทในใบเสนอราคาเปลี่ยนตามทันที ไม่ต้องกดบันทึก
// - เรทอัตโนมัติ = เรทตลาด + บวกเพิ่มของร้าน · หรือพิมพ์เรทเองเฉพาะวันนี้
// - หน้าดึงข้อมูลใหม่ทุก 1 นาที เรทที่คนอื่นแก้ / เรทตลาดใหม่จึงขึ้นเองโดยไม่ต้องรีเฟรช
const fmt = (n: number) => n.toLocaleString("th-TH", { maximumFractionDigits: 4 });
const time = (d: Date) =>
  new Date(d).toLocaleString("th-TH", { timeZone: "Asia/Bangkok", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
const LIVE_REFRESH_MS = 60_000;
const SAVE_DELAY_MS = 600;

export function RateBox({ q }: { q: QuoteRate }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [markup, setMarkup] = useState(String(q.markup));
  const [manual, setManual] = useState(q.mode === "manual" && q.rate != null ? String(q.rate) : "");
  const [saved, setSaved] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ดึงข้อมูลใหม่เป็นระยะ (เฉพาะตอนเปิดแท็บนี้อยู่)
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, LIVE_REFRESH_MS);
    return () => clearInterval(id);
  }, [router]);

  const run = (job: () => Promise<void>, message: string) =>
    startTransition(async () => {
      await job();
      router.refresh();
      setSaved(message);
    });

  // พิมพ์แล้วรอสักครู่ค่อยบันทึก (ไม่ยิงทุกตัวอักษร)
  const saveLater = (job: () => Promise<void>, message: string) => {
    setSaved(null);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => run(job, message), SAVE_DELAY_MS);
  };
  const fd = (key: string, value: string) => {
    const f = new FormData();
    f.set(key, value);
    return f;
  };

  const ok = q.rate != null;
  return (
    <section
      className={`mb-4 space-y-3 rounded-lg px-4 py-3 text-sm ring-1 print:hidden ${
        ok ? "bg-emerald-50 ring-emerald-200" : "bg-amber-50 ring-amber-300"
      }`}
    >
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="font-semibold">เรทที่ใช้ในใบเสนอราคา:</span>
        {ok ? (
          <span className="text-base font-bold text-emerald-800">1 หยวน = {fmt(q.rate!)} บาท</span>
        ) : (
          <span className="text-amber-800">⚠️ ดึงเรทตลาดไม่ได้ — พิมพ์เรทเองด้านล่าง</span>
        )}
        <span className="text-gray-600">
          {q.mode === "manual"
            ? `(ตั้งเองวันนี้ เวลา ${time(q.manualSetAt!)})`
            : q.mode === "auto"
              ? `(เรทตลาด ${fmt(q.market!.rate)} ${q.markup >= 0 ? "+" : "−"} ${fmt(Math.abs(q.markup))} ของร้าน)`
              : ""}
        </span>
        <span className="ml-auto text-xs text-gray-500">
          {pending ? "กำลังบันทึก…" : saved ? `✓ ${saved}` : "อัปเดตอัตโนมัติทุก 1 นาที"}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        <label className="flex items-center gap-2">
          <span>บวกเพิ่มจากเรทตลาด</span>
          <span className="w-24">
            <input
              type="number"
              step="0.01"
              value={markup}
              onChange={(e) => {
                setMarkup(e.target.value);
                if (e.target.value !== "") saveLater(() => saveCnyMarkup(fd("markup", e.target.value)), "บันทึกส่วนบวกเพิ่มแล้ว");
              }}
              className="input bg-white py-1"
            />
          </span>
          <span>บาท/หยวน</span>
        </label>

        <label className="flex items-center gap-2">
          <span>หรือพิมพ์เรทเองวันนี้</span>
          <span className="w-24">
            <input
              type="number"
              step="0.0001"
              min={0}
              value={manual}
              placeholder="อัตโนมัติ"
              onChange={(e) => {
                const v = e.target.value;
                setManual(v);
                saveLater(
                  v === "" ? () => resetToAutoCnyRate() : () => saveManualCnyRate(fd("rate", v)),
                  v === "" ? "กลับไปใช้เรทอัตโนมัติแล้ว" : "ใช้เรทที่พิมพ์แล้ว",
                );
              }}
              className="input bg-white py-1"
            />
          </span>
          <span>บาท</span>
        </label>
        {q.mode === "manual" && (
          <button
            type="button"
            onClick={() => {
              setManual("");
              run(() => resetToAutoCnyRate(), "กลับไปใช้เรทอัตโนมัติแล้ว");
            }}
            className="text-xs text-brand-700 hover:underline"
          >
            กลับไปใช้เรทอัตโนมัติ
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
        {q.market ? (
          <span>
            เรทตลาดจาก {q.market.source} · ดึงล่าสุด {time(q.market.fetchedAt)} (เช็กเรทใหม่ทุก 15 นาที แหล่งข้อมูลเปลี่ยนเรทวันละครั้ง)
          </span>
        ) : (
          <span>ยังดึงเรทตลาดไม่ได้</span>
        )}
        <button type="button" onClick={() => run(() => refreshMarketRate(), "ดึงเรทตลาดใหม่แล้ว")} className="text-brand-700 hover:underline">
          ดึงเรทใหม่ตอนนี้
        </button>
      </div>
    </section>
  );
}
