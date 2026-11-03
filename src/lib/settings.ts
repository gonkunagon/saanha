import { eq } from "drizzle-orm";
import { db } from "@/db";
import { appSettings } from "@/db/schema";

// เรทเงินหยวน → บาท สำหรับใบเสนอราคา (ไม่แสดงบนเว็บสาธารณะ)
// เรทที่ใช้ = เรทตลาด (ดึงอัตโนมัติ เก็บไว้ไม่เกิน 15 นาที) + ส่วนบวกเพิ่มของร้าน
// ถ้าพนักงานตั้งเรทเองไว้ในวันนี้ ใช้เรทนั้นแทน (หมดอายุเมื่อขึ้นวันใหม่)
const MANUAL = "cny_rate"; // เรทที่ตั้งเอง (เฉพาะวันที่ตั้ง)
const MARKET = "cny_market"; // เรทตลาดล่าสุดที่ดึงมา
const MARKUP = "cny_markup"; // บวกเพิ่ม บาท/หยวน (ค่าคงที่ ใช้ทุกวัน)
const MARKET_TTL_MS = 15 * 60 * 1000;

async function getSetting(key: string) {
  return db.query.appSettings.findFirst({ where: eq(appSettings.key, key) });
}
async function setSetting(key: string, value: string) {
  await db
    .insert(appSettings)
    .values({ key, value })
    .onConflictDoUpdate({ target: appSettings.key, set: { value, updatedAt: new Date() } });
}
const positive = (v: string | undefined) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
};

// วันเดียวกันตามเวลาไทยหรือไม่
export const sameBangkokDay = (a: Date, b: Date) =>
  a.toLocaleDateString("en-CA", { timeZone: "Asia/Bangkok" }) === b.toLocaleDateString("en-CA", { timeZone: "Asia/Bangkok" });

// ดึงเรทตลาด CNY→THB (แหล่งฟรี อัปเดตวันละครั้ง): exchangerate-api ก่อน ล่มแล้วใช้ Frankfurter (ECB)
async function fetchMarketRate(): Promise<{ rate: number; source: string } | null> {
  const sources: [string, string, (j: unknown) => number | undefined][] = [
    ["exchangerate-api.com", "https://open.er-api.com/v6/latest/CNY", (j) => (j as { rates?: Record<string, number> }).rates?.THB],
    ["frankfurter (ECB)", "https://api.frankfurter.dev/v1/latest?base=CNY&symbols=THB", (j) => (j as { rates?: Record<string, number> }).rates?.THB],
  ];
  for (const [source, url, pick] of sources) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(5000), cache: "no-store" });
      if (!res.ok) continue;
      const rate = pick(await res.json());
      if (rate && rate > 0) return { rate, source };
    } catch {
      // ลองแหล่งถัดไป
    }
  }
  return null;
}

export type MarketRate = { rate: number; source: string; fetchedAt: Date };

// เรทตลาด (ใช้ค่าที่เก็บไว้ถ้ายังไม่เกิน 15 นาที / ดึงไม่ได้ใช้ค่าล่าสุดที่มี)
export async function getMarketRate(force = false): Promise<MarketRate | null> {
  const row = await getSetting(MARKET);
  const cached = row ? (JSON.parse(row.value) as { rate: number; source: string }) : null;
  if (cached && row && !force && Date.now() - row.updatedAt.getTime() < MARKET_TTL_MS) {
    return { ...cached, fetchedAt: row.updatedAt };
  }
  const fresh = await fetchMarketRate();
  if (fresh) {
    await setSetting(MARKET, JSON.stringify(fresh));
    return { ...fresh, fetchedAt: new Date() };
  }
  return cached && row ? { ...cached, fetchedAt: row.updatedAt } : null;
}

export async function getCnyMarkup(): Promise<number> {
  const n = Number((await getSetting(MARKUP))?.value);
  return Number.isFinite(n) ? n : 0;
}
export const setCnyMarkup = (markup: number) => setSetting(MARKUP, String(markup));

export const setManualCnyRate = (rate: number) => setSetting(MANUAL, String(rate));
export const clearManualCnyRate = () => db.delete(appSettings).where(eq(appSettings.key, MANUAL));

export type QuoteRate = {
  rate: number | null; // เรทที่ใช้ในใบเสนอราคา
  mode: "manual" | "auto" | "none";
  market: MarketRate | null;
  markup: number;
  manualSetAt: Date | null;
};

// เรทที่ใบเสนอราคาของวันนี้ใช้
export async function getQuoteRate(now = new Date()): Promise<QuoteRate> {
  const [manualRow, market, markup] = await Promise.all([getSetting(MANUAL), getMarketRate(), getCnyMarkup()]);
  const manual = manualRow && sameBangkokDay(manualRow.updatedAt, now) ? positive(manualRow.value) : null;
  if (manual) return { rate: manual, mode: "manual", market, markup, manualSetAt: manualRow!.updatedAt };
  if (market) return { rate: Math.round((market.rate + markup) * 10000) / 10000, mode: "auto", market, markup, manualSetAt: null };
  return { rate: null, mode: "none", market: null, markup, manualSetAt: null };
}
