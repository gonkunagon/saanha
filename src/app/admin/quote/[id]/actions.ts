"use server";

import { revalidatePath } from "next/cache";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { clearManualCnyRate, getMarketRate, setCnyMarkup, setManualCnyRate } from "@/lib/settings";

const num = (fd: FormData, key: string) => parseFloat(String(fd.get(key) ?? ""));
const refresh = () => revalidatePath("/admin/quote", "layout");

// ส่วนบวกเพิ่มจากเรทตลาด (บาท/หยวน) — ใช้ทุกวันจนกว่าจะเปลี่ยน
export async function saveCnyMarkup(fd: FormData) {
  await requireUser();
  const markup = num(fd, "markup");
  if (!Number.isFinite(markup) || markup < -1 || markup > 5) return;
  await setCnyMarkup(Math.round(markup * 10000) / 10000);
  refresh();
}

// ตั้งเรทเองสำหรับวันนี้ (แทนเรทอัตโนมัติ) — ขึ้นวันใหม่กลับไปใช้อัตโนมัติ
export async function saveManualCnyRate(fd: FormData) {
  await requireUser();
  const rate = num(fd, "rate");
  if (!Number.isFinite(rate) || rate <= 0 || rate > 100) return;
  await setManualCnyRate(Math.round(rate * 10000) / 10000);
  refresh();
}

export async function resetToAutoCnyRate() {
  await requireUser();
  await clearManualCnyRate();
  refresh();
}

// ดึงเรทตลาดใหม่ทันที (ไม่รอครบ 15 นาที)
export async function refreshMarketRate() {
  await requireUser();
  await getMarketRate(true);
  refresh();
}

// ออกใบเสนอราคาใหม่เป็นวันนี้ (ล้างวันเปิดบิลเดิม — เปิดหน้าใหม่แล้วระบบล็อกวันนี้ + เรทวันนี้ให้)
export async function reissueQuote(fd: FormData) {
  await requireUser();
  await db.update(orders).set({ quotedAt: null, quoteRate: null, updatedAt: sql`${orders.updatedAt}` }) // ไม่นับเป็นการแก้ไขออเดอร์.where(eq(orders.id, Number(fd.get("orderId"))));
  refresh();
  revalidatePath("/admin", "layout");
}
