"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { deliveryRounds, orderItems } from "@/db/schema";
import { requireUser } from "@/lib/auth";

export type RoundInput = { date: string; qty: Record<string, number> };

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
    return { date: /^\d{4}-\d{2}-\d{2}$/.test(r.date) ? r.date : null, qty };
  });
  // รวมทุกรอบห้ามเกินจำนวนสินค้าของรายการนั้น
  for (const i of items) {
    const sum = clean.reduce((s, r) => s + (r.qty[String(i.id)] ?? 0), 0);
    if (i.quantity != null && sum > i.quantity) return `"${i.description}" รวมทุกรอบ ${sum} เกินจำนวนที่มี ${i.quantity}`;
  }
  await db.transaction(async (tx) => {
    await tx.delete(deliveryRounds).where(eq(deliveryRounds.orderId, orderId));
    if (clean.length) {
      await tx
        .insert(deliveryRounds)
        .values(clean.map((r, n) => ({ orderId, roundNo: n + 1, deliveryDate: r.date, quantities: r.qty })));
    }
  });
  revalidatePath("/admin", "layout");
  return null;
}
