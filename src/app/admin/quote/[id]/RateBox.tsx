import type { QuoteRate } from "@/lib/settings";
import { refreshMarketRate, saveCnyMarkup, saveManualCnyRate, useAutoCnyRate } from "./actions";

// กล่องเรทหยวน (บนจอเท่านั้น ไม่พิมพ์): เรทตลาดอัตโนมัติ + บวกเพิ่มของร้าน หรือตั้งเรทเองเฉพาะวันนี้
const fmt = (n: number) => n.toLocaleString("th-TH", { maximumFractionDigits: 4 });
const time = (d: Date) =>
  d.toLocaleString("th-TH", { timeZone: "Asia/Bangkok", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

export function RateBox({ q }: { q: QuoteRate }) {
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
          <span className="text-amber-800">⚠️ ดึงเรทตลาดไม่ได้ — ตั้งเรทเองด้านล่าง</span>
        )}
        <span className="text-gray-600">
          {q.mode === "manual"
            ? `(ตั้งเองวันนี้ เวลา ${time(q.manualSetAt!)})`
            : q.mode === "auto"
              ? `(เรทตลาด ${fmt(q.market!.rate)} ${q.markup >= 0 ? "+" : "−"} ${fmt(Math.abs(q.markup))} ของร้าน)`
              : ""}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        {/* ส่วนบวกเพิ่ม */}
        <form action={saveCnyMarkup} className="flex items-center gap-2">
          <span>บวกเพิ่มจากเรทตลาด</span>
          <span className="w-24">
            <input name="markup" type="number" step="0.01" defaultValue={q.markup} className="input bg-white py-1" />
          </span>
          <span>บาท/หยวน</span>
          <button className="rounded border border-gray-400 bg-white px-2 py-1 text-xs hover:bg-gray-50">บันทึก</button>
        </form>

        {/* ตั้งเรทเองเฉพาะวันนี้ */}
        <form action={saveManualCnyRate} className="flex items-center gap-2">
          <span>หรือตั้งเรทเองวันนี้</span>
          <span className="w-24">
            <input name="rate" type="number" step="0.0001" min={0} required defaultValue={q.mode === "manual" ? q.rate! : ""} className="input bg-white py-1" />
          </span>
          <button className="rounded border border-gray-400 bg-white px-2 py-1 text-xs hover:bg-gray-50">ใช้เรทนี้</button>
        </form>
        {q.mode === "manual" && (
          <form action={useAutoCnyRate}>
            <button className="text-xs text-brand-700 hover:underline">กลับไปใช้เรทอัตโนมัติ</button>
          </form>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
        {q.market ? (
          <span>
            เรทตลาดจาก {q.market.source} · ดึงล่าสุด {time(q.market.fetchedAt)} (อัปเดตอัตโนมัติทุก 1 ชม. แหล่งข้อมูลเปลี่ยนเรทวันละครั้ง)
          </span>
        ) : (
          <span>ยังดึงเรทตลาดไม่ได้</span>
        )}
        <form action={refreshMarketRate}>
          <button className="text-brand-700 hover:underline">ดึงเรทใหม่ตอนนี้</button>
        </form>
      </div>
    </section>
  );
}
