"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { orderExtraCharges, orderItems, orders } from "@/db/schema";
import { requireUser } from "@/lib/auth";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

const money = (v: FormDataEntryValue | null) => {
  const s = String(v ?? "").replace(/,/g, "").trim();
  const n = Number(s);
  return s === "" || !isFinite(n) || n < 0 ? null : Math.round(n * 100) / 100;
};

// เก็บผลรวมไว้ที่ออเดอร์ (ยอดค้างชำระ / กำไร ในทุกหน้าใช้ค่านี้)
async function syncTotals(tx: Tx, orderId: number) {
  const rows = await tx.select().from(orderExtraCharges).where(eq(orderExtraCharges.orderId, orderId));
  const sum = (pick: (r: (typeof rows)[number]) => number | null) => Math.round(rows.reduce((s, r) => s + (pick(r) ?? 0), 0) * 100) / 100;
  await tx.update(orders).set({ extraCharge: sum((r) => r.charge), extraCost: sum((r) => r.cost) }).where(eq(orders.id, orderId));
}

// บันทึก (เพิ่ม/แก้) ค่าใช้จ่ายเพิ่มเติม 1 รายการ · คืนข้อความ error หรือ null
export async function saveExtraCharge(_prev: string | null, fd: FormData): Promise<string | null> {
  await requireUser();
  const orderId = Number(fd.get("orderId"));
  const extraId = Number(fd.get("extraId")) || null;
  const description = String(fd.get("description") ?? "").trim();
  if (!description) return "ใส่หมายเหตุ / รายละเอียดค่าใช้จ่าย";
  const charge = money(fd.get("charge"));
  const cost = money(fd.get("cost"));
  if (charge == null && cost == null) return "ใส่ยอดคิดลูกค้า หรือยอดที่จ่ายบริษัทขนส่ง อย่างน้อย 1 ช่อง";

  // ตู้ต้องเป็นตู้ที่รายการของออเดอร์นี้อยู่ (ว่าง = ตู้แรกของออเดอร์)
  const containerId = Number(fd.get("containerId")) || null;
  if (containerId != null) {
    const inBox = await db.query.orderItems.findFirst({ where: and(eq(orderItems.orderId, orderId), eq(orderItems.containerId, containerId)) });
    if (!inBox) return "ตู้ที่เลือกไม่มีสินค้าของออเดอร์นี้";
  }

  const values = { orderId, containerId, description, charge, cost };
  await db.transaction(async (tx) => {
    if (extraId) {
      await tx.update(orderExtraCharges).set(values).where(and(eq(orderExtraCharges.id, extraId), eq(orderExtraCharges.orderId, orderId)));
    } else {
      await tx.insert(orderExtraCharges).values(values);
    }
    await syncTotals(tx, orderId);
  });
  revalidatePath("/admin", "layout");
  return null;
}

export async function deleteExtraCharge(orderId: number, extraId: number): Promise<void> {
  await requireUser();
  await db.transaction(async (tx) => {
    await tx.delete(orderExtraCharges).where(and(eq(orderExtraCharges.id, extraId), eq(orderExtraCharges.orderId, orderId)));
    await syncTotals(tx, orderId);
  });
  revalidatePath("/admin", "layout");
}
