"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { deliveryRounds, orderItems } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { deliverableBoxes, lostBoxesOf, syncItemsFromRounds } from "@/lib/rounds";

// deliveredAt = ISO string (ส่งรอบนี้แล้ว) หรือ null
export type RoundInput = { date: string; qty: Record<string, number>; deliveredAt?: string | null };

// บันทึกรอบจัดส่งทั้งหมดของออเดอร์ (แทนของเดิม) · ส่ง [] = ยกเลิกการแยกรอบ
// คืนข้อความ error หรือ null ถ้าสำเร็จ
export async function saveDeliveryRounds(orderId: number, rounds: RoundInput[]): Promise<string | null> {
  await requireUser();
  const items = await db
    .select({ id: orderItems.id, description: orderItems.description, boxes: orderItems.boxes })
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
  // รวมทุกรอบห้ามเกินจำนวนกล่องของรายการนั้น (ไม่นับกล่องที่สูญหาย)
  const lost = await lostBoxesOf(db, orderId);
  for (const i of items) {
    const sum = clean.reduce((s, r) => s + (r.qty[String(i.id)] ?? 0), 0);
    const max = deliverableBoxes(i.boxes, lost.get(i.id));
    if (max != null && sum > max)
      return `"${i.description}" รวมทุกรอบ ${sum} กล่อง เกินจำนวนกล่องที่ต้องส่ง ${max}${lost.get(i.id) ? ` (หักที่สูญหาย ${lost.get(i.id)} กล่องแล้ว)` : ""}`;
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
