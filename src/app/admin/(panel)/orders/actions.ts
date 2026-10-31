"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { containers, orderItems, orders, shippingMethods, type ShippingMethod } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { parseLocalDateTime } from "@/lib/datetime";
import { nextOrderCode } from "@/lib/orders";
import { containerStageFields, itemStages, stageIndex, type ContainerStage, type ItemStage } from "@/lib/stages";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

const str = (v: FormDataEntryValue | null | undefined) => String(v ?? "").trim() || null;
const text = (fd: FormData, key: string) => str(fd.get(key));
const toInt = (v: FormDataEntryValue | null | undefined) => {
  const n = parseInt(String(v ?? ""), 10);
  return Number.isFinite(n) ? n : null;
};
const toNum = (v: FormDataEntryValue | null | undefined) => {
  const n = parseFloat(String(v ?? ""));
  return Number.isFinite(n) ? n : null;
};
const method = (fd: FormData): ShippingMethod => {
  const m = String(fd.get("method"));
  return (shippingMethods as readonly string[]).includes(m) ? (m as ShippingMethod) : "truck";
};
const refresh = () => revalidatePath("/admin", "layout");

// พิมพ์เลขตู้ได้เลย ถ้ายังไม่มีตู้นี้ ระบบสร้างให้อัตโนมัติ
async function findOrCreateContainer(tx: Tx, code: string, m: ShippingMethod) {
  const normalized = code.trim().toUpperCase();
  const existing = await tx.query.containers.findFirst({ where: eq(containers.code, normalized) });
  if (existing) return existing;
  const [created] = await tx.insert(containers).values({ code: normalized, method: m }).returning();
  return created;
}

// ---- ออเดอร์ ----

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

// สร้างออเดอร์พร้อมรายการสินค้าในฟอร์มเดียว
export async function createOrder(_prev: string | null, fd: FormData): Promise<string | null> {
  await requireUser();
  const fields = orderFields(fd);
  if (!fields.customerName || fields.customerPhone.replace(/\D/g, "").length < 4) {
    return "กรุณาใส่ชื่อลูกค้าและเบอร์โทรให้ครบ";
  }

  const descriptions = fd.getAll("itemDescription");
  const items = descriptions
    .map((d, i) => ({
      description: str(d) ?? "",
      quantity: toInt(fd.getAll("itemQuantity")[i]),
      boxes: toInt(fd.getAll("itemBoxes")[i]),
      weightKg: toNum(fd.getAll("itemWeightKg")[i]),
      cbm: toNum(fd.getAll("itemCbm")[i]),
      chinaTrackingNo: str(fd.getAll("itemChinaTrackingNo")[i]),
    }))
    .filter((i) => i.description);

  // กันเลขออเดอร์ชนกันกรณีสร้างพร้อมกัน
  let newId: number | null = null;
  for (let attempt = 0; attempt < 3 && newId === null; attempt++) {
    try {
      newId = await db.transaction(async (tx) => {
        const [row] = await tx
          .insert(orders)
          .values({ ...fields, code: await nextOrderCode() })
          .returning({ id: orders.id });
        if (items.length) await tx.insert(orderItems).values(items.map((i) => ({ ...i, orderId: row.id })));
        return row.id;
      });
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

// ---- รายการสินค้า ----

export async function addItem(fd: FormData) {
  await requireUser();
  const description = text(fd, "description");
  if (!description) return;
  await db.insert(orderItems).values({
    orderId: Number(fd.get("orderId")),
    description,
    quantity: toInt(fd.get("quantity")),
    boxes: toInt(fd.get("boxes")),
    weightKg: toNum(fd.get("weightKg")),
    cbm: toNum(fd.get("cbm")),
    chinaTrackingNo: text(fd, "chinaTrackingNo"),
  });
  refresh();
}

// แก้ไขรายละเอียด/วันที่ของรายการ (ใช้แก้ข้อมูลผิด)
export async function updateItem(fd: FormData) {
  await requireUser();
  const description = text(fd, "description");
  if (!description) return;
  const itemId = Number(fd.get("itemId"));
  await db.transaction(async (tx) => {
    const item = await tx.query.orderItems.findFirst({ where: eq(orderItems.id, itemId), with: { order: true } });
    if (!item) return;
    const code = text(fd, "containerCode");
    const container = code ? await findOrCreateContainer(tx, code, item.order.method) : null;
    await tx
      .update(orderItems)
      .set({
        description,
        quantity: toInt(fd.get("quantity")),
        chinaTrackingNo: text(fd, "chinaTrackingNo"),
        boxes: toInt(fd.get("boxes")),
        weightKg: toNum(fd.get("weightKg")),
        cbm: toNum(fd.get("cbm")),
        containerId: container?.id ?? null,
        receivedAt: parseLocalDateTime(fd.get("receivedAt")),
        outForDeliveryAt: parseLocalDateTime(fd.get("outForDeliveryAt")),
        deliveredAt: parseLocalDateTime(fd.get("deliveredAt")),
        domesticTracking: text(fd, "domesticTracking"),
      })
      .where(eq(orderItems.id, itemId));
  });
  refresh();
}

export async function deleteItem(fd: FormData) {
  await requireUser();
  await db.delete(orderItems).where(eq(orderItems.id, Number(fd.get("itemId"))));
  refresh();
}

// ---- อัปเดตสถานะในขั้นตอนเดียว ----
// พนักงานเลือกรายการ → เลือกสถานะ → บันทึก ระบบจัดการที่เหลือให้:
// - ขั้นก่อนหน้าที่ยังไม่มีวันที่ จะใส่วันที่เดียวกันให้
// - ถ้าใส่เลขตู้ จะย้ายรายการเข้าตู้นั้น (ไม่มีตู้นี้ = สร้างใหม่)
// - ขั้นของตู้ (ปิดตู้ → ถึงโกดังไทย) บันทึกที่ตู้ ออเดอร์อื่นในตู้เดียวกันจึงเปลี่ยนตามด้วย
// - ถ้าย้อนสถานะ วันที่ของขั้นหลังจากนั้นที่อยู่ในรายการจะถูกล้าง (ขั้นของตู้ต้องแก้ที่หน้าตู้)

export async function applyStage(_prev: string | null, fd: FormData): Promise<string | null> {
  await requireUser();
  const orderId = Number(fd.get("orderId"));
  const itemIds = fd.getAll("itemId").map(Number).filter(Boolean);
  const stage = String(fd.get("stage")) as ItemStage;
  if (itemIds.length === 0) return "กรุณาเลือกรายการสินค้าอย่างน้อย 1 รายการ";
  if (!itemStages.includes(stage) || stage === "ordered") return "กรุณาเลือกสถานะ";

  const at = parseLocalDateTime(fd.get("at")) ?? new Date();
  const idx = stageIndex(stage);
  const reached = (s: ItemStage) => idx >= stageIndex(s);
  const containerCode = text(fd, "containerCode");
  const domesticTracking = text(fd, "domesticTracking");

  const order = await db.query.orders.findFirst({
    where: eq(orders.id, orderId),
    with: { items: true },
  });
  if (!order) return "ไม่พบออเดอร์";
  const items = order.items.filter((i) => itemIds.includes(i.id));

  if (reached("loaded") && !containerCode && items.some((i) => !i.containerId)) {
    return "มีรายการที่ยังไม่เข้าตู้ กรุณาใส่เลขตู้";
  }

  await db.transaction(async (tx) => {
    const target = containerCode ? await findOrCreateContainer(tx, containerCode, order.method) : null;

    for (const item of items) {
      const set = (s: ItemStage, current: Date | null) =>
        s === stage ? at : reached(s) ? current ?? at : null;
      await tx
        .update(orderItems)
        .set({
          containerId: target?.id ?? item.containerId,
          receivedAt: set("china_warehouse", item.receivedAt),
          outForDeliveryAt: set("out_for_delivery", item.outForDeliveryAt),
          deliveredAt: set("delivered", item.deliveredAt),
          domesticTracking: reached("out_for_delivery") ? domesticTracking ?? item.domesticTracking : item.domesticTracking,
        })
        .where(eq(orderItems.id, item.id));
    }

    // ขั้นของตู้: เติมวันที่ของทุกขั้นจนถึงขั้นที่เลือก
    if (reached("loaded")) {
      const containerIds = [...new Set(items.map((i) => target?.id ?? i.containerId).filter((v): v is number => Boolean(v)))];
      for (const cid of containerIds) {
        const c = await tx.query.containers.findFirst({ where: eq(containers.id, cid) });
        if (!c) continue;
        const update: Partial<Record<(typeof containerStageFields)[ContainerStage], Date>> = {};
        for (const [s, field] of Object.entries(containerStageFields) as [ContainerStage, (typeof containerStageFields)[ContainerStage]][]) {
          if (s === stage) update[field] = at;
          else if (reached(s) && !c[field]) update[field] = at;
        }
        if (Object.keys(update).length) await tx.update(containers).set(update).where(eq(containers.id, cid));
      }
    }
  });

  refresh();
  return null;
}
