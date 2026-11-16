"use server";

import { and, asc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { deliveryRounds, orderItems } from "@/db/schema";
import { requireUser } from "@/lib/auth";

// deliveredAt = ISO string (ส่งรอบนี้แล้ว) หรือ null
export type RoundInput = { date: string; qty: Record<string, number>; deliveredAt?: string | null };

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

// สถานะจัดส่งของรายการ ตามรอบที่ยืนยันส่งแล้ว (เฉพาะรายการที่อยู่ในรอบส่ง):
// - ส่งครบจำนวน → จัดส่งสำเร็จ (วันที่ = รอบสุดท้ายที่ส่ง) · ส่งบางส่วน → กำลังจัดส่ง · ยังไม่ส่งเลย → ล้างวันที่จัดส่ง
// แตะเฉพาะรายการที่อยู่ในรอบที่ยืนยันส่งแล้ว + also (รายการที่เพิ่งยกเลิกยืนยัน) — แค่วางแผนรอบ ไม่เปลี่ยนสถานะ
async function syncItemsFromRounds(tx: Tx, orderId: number, also: Set<string> = new Set()) {
  const rounds = await tx.select().from(deliveryRounds).where(eq(deliveryRounds.orderId, orderId)).orderBy(asc(deliveryRounds.roundNo));
  const items = await tx.select().from(orderItems).where(eq(orderItems.orderId, orderId));
  for (const item of items) {
    const key = String(item.id);
    const mine = rounds.filter((r) => (r.quantities[key] ?? 0) > 0);
    const sent = mine.filter((r) => r.deliveredAt);
    if (mine.length === 0 || (sent.length === 0 && !also.has(key))) continue; // ไม่เกี่ยวกับรอบที่ส่งแล้ว = ไม่แตะ
    const sentQty = sent.reduce((s, r) => s + (r.quantities[key] ?? 0), 0);
    const dates = sent.map((r) => r.deliveredAt!.getTime());
    const first = dates.length ? new Date(Math.min(...dates)) : null;
    const last = dates.length ? new Date(Math.max(...dates)) : null;
    // ไม่ได้ใส่จำนวนสินค้า = ส่งครบเมื่อทุกรอบที่มีรายการนี้ส่งแล้ว
    const full = item.quantity != null ? sentQty >= item.quantity : sent.length === mine.length;
    await tx
      .update(orderItems)
      .set({
        // ถึงขั้นส่งให้ลูกค้าแล้ว = ขั้นถึงโกดังจีนต้องมีวันที่ (เติมให้ถ้ายังว่าง)
        receivedAt: first ? (item.receivedAt ?? first) : item.receivedAt,
        outForDeliveryAt: first ? (item.outForDeliveryAt && item.outForDeliveryAt <= first ? item.outForDeliveryAt : first) : null,
        deliveredAt: full ? last : null,
      })
      .where(eq(orderItems.id, item.id));
  }
}

// บันทึกรอบจัดส่งทั้งหมดของออเดอร์ (แทนของเดิม) · ส่ง [] = ยกเลิกการแยกรอบ
// คืนข้อความ error หรือ null ถ้าสำเร็จ
export async function saveDeliveryRounds(orderId: number, rounds: RoundInput[]): Promise<string | null> {
  await requireUser();
  const items = await db
    .select({ id: orderItems.id, description: orderItems.description, quantity: orderItems.quantity })
    .from(orderItems)
    .where(eq(orderItems.orderId, orderId));
  const clean = rounds.map((r) => {
    const qty: Record<string, number> = {};
    for (const i of items) {
      const n = Math.max(0, Math.floor(Number(r.qty[String(i.id)]) || 0));
      if (n > 0) qty[String(i.id)] = n;
    }
    const delivered = r.deliveredAt ? new Date(r.deliveredAt) : null;
    return {
      date: /^\d{4}-\d{2}-\d{2}$/.test(r.date) ? r.date : null,
      qty,
      deliveredAt: delivered && !isNaN(delivered.getTime()) ? delivered : null,
    };
  });
  // รวมทุกรอบห้ามเกินจำนวนสินค้าของรายการนั้น
  for (const i of items) {
    const sum = clean.reduce((s, r) => s + (r.qty[String(i.id)] ?? 0), 0);
    if (i.quantity != null && sum > i.quantity) return `"${i.description}" รวมทุกรอบ ${sum} เกินจำนวนที่มี ${i.quantity}`;
  }
  // รายการที่ถูกเอาออกจากรอบทั้งหมด: ล้างสถานะที่เคยมาจากรอบส่งที่ยืนยันแล้ว
  const before = await db.select().from(deliveryRounds).where(eq(deliveryRounds.orderId, orderId));
  const droppedIds = items
    .filter((i) => before.some((r) => r.deliveredAt && (r.quantities[String(i.id)] ?? 0) > 0))
    .filter((i) => !clean.some((r) => (r.qty[String(i.id)] ?? 0) > 0))
    .map((i) => i.id);

  await db.transaction(async (tx) => {
    await tx.delete(deliveryRounds).where(eq(deliveryRounds.orderId, orderId));
    if (clean.length) {
      await tx.insert(deliveryRounds).values(
        clean.map((r, n) => ({ orderId, roundNo: n + 1, deliveryDate: r.date, quantities: r.qty, deliveredAt: r.deliveredAt })),
      );
    }
    for (const id of droppedIds) {
      await tx.update(orderItems).set({ outForDeliveryAt: null, deliveredAt: null }).where(eq(orderItems.id, id));
    }
    // รายการที่เคยอยู่ในรอบที่ส่งแล้ว (ก่อนแก้) → คำนวณใหม่ด้วย
    const wasSent = new Set(before.filter((r) => r.deliveredAt).flatMap((r) => Object.keys(r.quantities)));
    await syncItemsFromRounds(tx, orderId, wasSent);
  });
  revalidatePath("/admin", "layout");
  return null;
}

// ยืนยันว่าส่งรอบนี้แล้ว (หรือยกเลิกการยืนยัน) → อัปเดตสถานะจัดส่งของรายการในรอบให้อัตโนมัติ
export async function setRoundDelivered(orderId: number, roundNo: number, at: string | null): Promise<string | null> {
  await requireUser();
  const when = at ? new Date(at) : null;
  if (at && (!when || isNaN(when.getTime()))) return "วันที่ไม่ถูกต้อง";
  await db.transaction(async (tx) => {
    const [round] = await tx
      .update(deliveryRounds)
      .set({ deliveredAt: when })
      .where(and(eq(deliveryRounds.orderId, orderId), eq(deliveryRounds.roundNo, roundNo)))
      .returning({ quantities: deliveryRounds.quantities });
    if (round) await syncItemsFromRounds(tx, orderId, new Set(Object.keys(round.quantities)));
  });
  revalidatePath("/admin", "layout");
  return null;
}
