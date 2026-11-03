import { eq } from "drizzle-orm";
import { db } from "@/db";
import { appSettings } from "@/db/schema";

// เรทเงินหยวน → บาท ของวันนี้ (พนักงานอัปเดตทุกวันที่หน้าใบเสนอราคา) — ใช้เฉพาะในใบเสนอราคา ไม่แสดงบนเว็บสาธารณะ
const CNY_RATE = "cny_rate";

export async function getCnyRate(): Promise<{ rate: number; updatedAt: Date } | null> {
  const row = await db.query.appSettings.findFirst({ where: eq(appSettings.key, CNY_RATE) });
  const rate = row ? Number(row.value) : NaN;
  return row && Number.isFinite(rate) && rate > 0 ? { rate, updatedAt: row.updatedAt } : null;
}

export async function setCnyRate(rate: number) {
  await db
    .insert(appSettings)
    .values({ key: CNY_RATE, value: String(rate) })
    .onConflictDoUpdate({ target: appSettings.key, set: { value: String(rate), updatedAt: new Date() } });
}

// วันเดียวกันตามเวลาไทยหรือไม่ (เรทใช้ได้แค่วันที่ตั้ง)
export const sameBangkokDay = (a: Date, b: Date) =>
  a.toLocaleDateString("en-CA", { timeZone: "Asia/Bangkok" }) === b.toLocaleDateString("en-CA", { timeZone: "Asia/Bangkok" });
