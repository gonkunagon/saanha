import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { deliveryRounds, itemIssues, orderItems } from "@/db/schema";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
type Db = Tx | typeof db;

// กล่องที่สูญหายของแต่ละรายการ (จากแจ้งปัญหาสินค้า) — หักออกจากจำนวนที่ต้องส่ง
export async function lostBoxesOf(q: Db, orderId: number): Promise<Map<number, number>> {
  const rows = await q
    .select({ itemId: itemIssues.itemId, boxes: itemIssues.boxes })
    .from(itemIssues)
    .where(and(eq(itemIssues.orderId, orderId), eq(itemIssues.kind, "lost")));
  const lost = new Map<number, number>();
  for (const r of rows) lost.set(r.itemId, (lost.get(r.itemId) ?? 0) + (r.boxes ?? 0));
  return lost;
}

// จำนวนกล่องที่ต้องส่งจริง = กล่องทั้งหมด − กล่องที่สูญหาย (ไม่มีจำนวนกล่อง = null)
export const deliverableBoxes = (boxes: number | null, lost = 0) => (boxes == null ? null : Math.max(0, boxes - lost));

// สถานะจัดส่งของรายการ ตามรอบที่ยืนยันส่งแล้ว (เฉพาะรายการที่อยู่ในรอบส่ง):
// - ส่งครบทุกกล่อง (ไม่นับกล่องที่สูญหาย) → จัดส่งสำเร็จ (วันที่ = รอบสุดท้ายที่ส่ง) · ส่งบางส่วน → กำลังจัดส่ง · ยังไม่ส่งเลย → ล้างวันที่จัดส่ง
// แตะเฉพาะรายการที่อยู่ในรอบที่ยืนยันส่งแล้ว + also (รายการที่เพิ่งเปลี่ยน) — แค่วางแผนรอบ ไม่เปลี่ยนสถานะ
export async function syncItemsFromRounds(tx: Tx, orderId: number, also: Set<string> = new Set()) {
  const rounds = await tx.select().from(deliveryRounds).where(eq(deliveryRounds.orderId, orderId)).orderBy(asc(deliveryRounds.roundNo));
  const items = await tx.select().from(orderItems).where(eq(orderItems.orderId, orderId));
  const lost = await lostBoxesOf(tx, orderId);
  for (const item of items) {
    const key = String(item.id);
    const mine = rounds.filter((r) => (r.quantities[key] ?? 0) > 0);
    const sent = mine.filter((r) => r.deliveredAt);
    if (mine.length === 0 || (sent.length === 0 && !also.has(key))) continue; // ไม่เกี่ยวกับรอบที่ส่งแล้ว = ไม่แตะ
    const sentQty = sent.reduce((s, r) => s + (r.quantities[key] ?? 0), 0);
    const dates = sent.map((r) => r.deliveredAt!.getTime());
    const first = dates.length ? new Date(Math.min(...dates)) : null;
    const last = dates.length ? new Date(Math.max(...dates)) : null;
    // รอบส่งนับเป็นกล่อง · ไม่มีจำนวนกล่อง = ส่งครบเมื่อทุกรอบที่มีรายการนี้ส่งแล้ว
    const need = deliverableBoxes(item.boxes, lost.get(item.id));
    const full = need != null ? sent.length > 0 && sentQty >= need : sent.length === mine.length;
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
