"use server";

import { and, eq, inArray, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { orderItems, orders, shippingMethods, type ShippingMethod } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { parseLocalDateTime } from "@/lib/datetime";
import { nextOrderCode, stageOfItem } from "@/lib/orders";

const text = (fd: FormData, key: string) => String(fd.get(key) ?? "").trim() || null;
const int = (fd: FormData, key: string) => {
  const n = parseInt(String(fd.get(key) ?? ""), 10);
  return Number.isFinite(n) ? n : null;
};
const num = (fd: FormData, key: string) => {
  const n = parseFloat(String(fd.get(key) ?? ""));
  return Number.isFinite(n) ? n : null;
};
const method = (fd: FormData): ShippingMethod => {
  const m = String(fd.get("method"));
  return (shippingMethods as readonly string[]).includes(m) ? (m as ShippingMethod) : "truck";
};
const refresh = () => revalidatePath("/admin", "layout");

function orderFields(fd: FormData) {
  return {
    customerName: text(fd, "customerName") ?? "",
    customerPhone: text(fd, "customerPhone") ?? "",
    customerLineId: text(fd, "customerLineId"),
    method: method(fd),
    provider: text(fd, "provider"),
    externalId: text(fd, "externalId"),
    note: text(fd, "note"),
    internalNote: text(fd, "internalNote"),
  };
}

export async function createOrder(_prev: string | null, fd: FormData): Promise<string | null> {
  await requireUser();
  const fields = orderFields(fd);
  if (!fields.customerName || fields.customerPhone.replace(/\D/g, "").length < 4) {
    return "กรุณาใส่ชื่อลูกค้าและเบอร์โทรให้ครบ";
  }
  // กันเลขออเดอร์ชนกันกรณีสร้างพร้อมกัน
  let newId: number | null = null;
  for (let attempt = 0; attempt < 3 && newId === null; attempt++) {
    try {
      const [row] = await db
        .insert(orders)
        .values({ ...fields, code: await nextOrderCode() })
        .returning({ id: orders.id });
      newId = row.id;
    } catch (err) {
      if (!String(err).includes("UNIQUE")) throw err;
    }
  }
  if (newId === null) return "สร้างเลขออเดอร์ไม่สำเร็จ กรุณาลองใหม่";
  refresh();
  redirect(`/admin/orders/${newId}`);
}

export async function updateOrder(fd: FormData) {
  await requireUser();
  const fields = orderFields(fd);
  if (!fields.customerName || !fields.customerPhone) return;
  await db.update(orders).set(fields).where(eq(orders.id, Number(fd.get("id"))));
  refresh();
}

export async function deleteOrder(fd: FormData) {
  await requireUser();
  const id = Number(fd.get("id"));
  await db.delete(orderItems).where(eq(orderItems.orderId, id));
  await db.delete(orders).where(eq(orders.id, id));
  refresh();
  redirect("/admin/orders");
}

function itemFields(fd: FormData) {
  const containerId = int(fd, "containerId");
  return {
    description: text(fd, "description") ?? "",
    quantity: int(fd, "quantity"),
    chinaTrackingNo: text(fd, "chinaTrackingNo"),
    boxes: int(fd, "boxes"),
    weightKg: num(fd, "weightKg"),
    cbm: num(fd, "cbm"),
    containerId: containerId && containerId > 0 ? containerId : null,
    receivedAt: parseLocalDateTime(fd.get("receivedAt")),
    outForDeliveryAt: parseLocalDateTime(fd.get("outForDeliveryAt")),
    deliveredAt: parseLocalDateTime(fd.get("deliveredAt")),
    domesticTracking: text(fd, "domesticTracking"),
  };
}

export async function addItem(fd: FormData) {
  await requireUser();
  const fields = itemFields(fd);
  if (!fields.description) return;
  await db.insert(orderItems).values({ ...fields, orderId: Number(fd.get("orderId")) });
  refresh();
}

export async function updateItem(fd: FormData) {
  await requireUser();
  const fields = itemFields(fd);
  if (!fields.description) return;
  await db.update(orderItems).set(fields).where(eq(orderItems.id, Number(fd.get("itemId"))));
  refresh();
}

export async function deleteItem(fd: FormData) {
  await requireUser();
  await db.delete(orderItems).where(eq(orderItems.id, Number(fd.get("itemId"))));
  refresh();
}

// ---- อัปเดตหลายรายการพร้อมกัน ----

// บันทึก "ถึงโกดังจีน" ให้ทุกรายการในออเดอร์ที่ยังไม่มีวันที่
export async function markAllReceived(fd: FormData) {
  await requireUser();
  const at = parseLocalDateTime(fd.get("at"));
  if (!at) return;
  await db
    .update(orderItems)
    .set({ receivedAt: at })
    .where(and(eq(orderItems.orderId, Number(fd.get("orderId"))), isNull(orderItems.receivedAt)));
  refresh();
}

// ส่งออกให้ลูกค้า: เฉพาะรายการที่ตู้ถึงโกดังไทยแล้วและยังไม่ได้ส่ง (ส่งบางส่วนได้)
export async function markReadyItemsOutForDelivery(fd: FormData) {
  await requireUser();
  const at = parseLocalDateTime(fd.get("at"));
  if (!at) return;
  const items = await db.query.orderItems.findMany({
    where: eq(orderItems.orderId, Number(fd.get("orderId"))),
    with: { container: true },
  });
  const ids = items.filter((i) => stageOfItem(i) === "thai_warehouse").map((i) => i.id);
  if (ids.length === 0) return;
  await db
    .update(orderItems)
    .set({ outForDeliveryAt: at, domesticTracking: text(fd, "domesticTracking") })
    .where(inArray(orderItems.id, ids));
  refresh();
}

// จัดส่งสำเร็จ: ทุกรายการที่กำลังจัดส่งอยู่
export async function markOutItemsDelivered(fd: FormData) {
  await requireUser();
  const at = parseLocalDateTime(fd.get("at"));
  if (!at) return;
  const items = await db.query.orderItems.findMany({
    where: eq(orderItems.orderId, Number(fd.get("orderId"))),
    with: { container: true },
  });
  const ids = items.filter((i) => stageOfItem(i) === "out_for_delivery").map((i) => i.id);
  if (ids.length === 0) return;
  await db.update(orderItems).set({ deliveredAt: at }).where(inArray(orderItems.id, ids));
  refresh();
}
