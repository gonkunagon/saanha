"use server";

import { and, eq, inArray, isNotNull, type SQL } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { containers, ignoredImports, itemPackages, orderItems, orders, shippingMethods, type ShippingMethod } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { parseLocalDateTime } from "@/lib/datetime";
import { nextOrderCode } from "@/lib/orders";
import { calcCbm } from "@/lib/cbm";
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

// ---- พัสดุย่อยของรายการ ----

// แถวพัสดุจากฟอร์ม (ช่องชื่อขึ้นต้นด้วย prefix ส่งมาหลายแถว) ข้ามแถวที่ว่างทั้งแถว
function parsePackages(fd: FormData, prefix: string) {
  const col = (k: string) => fd.getAll(`${prefix}${k}`);
  return col("chinaTrackingNo")
    .map((tracking, i) => {
      const boxes = toInt(col("boxes")[i]);
      const widthCm = toNum(col("widthCm")[i]);
      const lengthCm = toNum(col("lengthCm")[i]);
      const heightCm = toNum(col("heightCm")[i]);
      return {
        importKey: str(col("importKey")[i]),
        chinaTrackingNo: str(tracking),
        boxes,
        weightKg: toNum(col("weightKg")[i]),
        widthCm,
        lengthCm,
        heightCm,
        cbm: calcCbm(widthCm, lengthCm, heightCm, boxes),
      };
    })
    .filter((p) => p.chinaTrackingNo || [p.boxes, p.weightKg, p.widthCm, p.lengthCm, p.heightCm].some((v) => v != null));
}
type PackageRow = ReturnType<typeof parsePackages>[number];

// ยอดรวมของรายการ = ผลรวมพัสดุทุกแถว (ไม่มีข้อมูลเลย = ว่าง)
function packageTotals(pkgs: PackageRow[]) {
  const sum = (vals: (number | null)[], digits: number) =>
    vals.some((v) => v != null)
      ? Math.round(vals.reduce<number>((s, v) => s + (v ?? 0), 0) * 10 ** digits) / 10 ** digits
      : null;
  return {
    boxes: sum(pkgs.map((p) => p.boxes), 0),
    weightKg: sum(pkgs.map((p) => p.weightKg), 2),
    cbm: sum(pkgs.map((p) => p.cbm), 4),
  };
}

// พัสดุที่นำเข้าจากระบบอื่นแล้วถูกลบ: จำ import_key ไว้ ซิงค์ครั้งหน้าจะไม่ดึงกลับมา
async function rememberDeletedImports(tx: Tx, where: SQL | undefined) {
  const rows = await tx.select({ key: itemPackages.importKey }).from(itemPackages).where(and(where, isNotNull(itemPackages.importKey)));
  if (rows.length) {
    await tx.insert(ignoredImports).values(rows.map((r) => ({ importKey: r.key! }))).onConflictDoNothing();
  }
}

// บันทึกพัสดุของรายการใหม่ทั้งชุด — แถวที่มี importKey (มาจาก JJ) เก็บคีย์เดิมไว้
// แถวที่นำเข้ามาแต่พนักงานลบออกจากฟอร์ม จะถูกจำไว้ไม่ให้ซิงค์ดึงกลับมา
async function savePackages(tx: Tx, itemId: number, pkgs: PackageRow[]) {
  const kept = new Set(pkgs.map((p) => p.importKey).filter(Boolean));
  const removed = await tx
    .select({ key: itemPackages.importKey })
    .from(itemPackages)
    .where(and(eq(itemPackages.itemId, itemId), isNotNull(itemPackages.importKey)));
  const dropped = removed.map((r) => r.key!).filter((k) => !kept.has(k));
  if (dropped.length) await tx.insert(ignoredImports).values(dropped.map((importKey) => ({ importKey }))).onConflictDoNothing();
  await tx.delete(itemPackages).where(eq(itemPackages.itemId, itemId));
  if (pkgs.length) await tx.insert(itemPackages).values(pkgs.map((p) => ({ ...p, itemId })));
}

// ---- ออเดอร์ ----

function orderFields(fd: FormData) {
  return {
    customerName: text(fd, "customerName") ?? "",
    customerPhone: text(fd, "customerPhone") ?? "",
    customerLineId: text(fd, "customerLineId"),
    purchaseOrderNo: text(fd, "purchaseOrderNo"),
    shopName: text(fd, "shopName"),
    currency: fd.get("currency") === "CNY" ? ("CNY" as const) : ("THB" as const),
    totalAmount: toNum(fd.get("totalAmount")),
    depositAmount: toNum(fd.get("depositAmount")),
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

  // แต่ละแถวสินค้ามี itemKey ใช้จับคู่กับช่องพัสดุของแถวนั้น (pkg_<key>_...)
  const descriptions = fd.getAll("itemDescription");
  const items = fd
    .getAll("itemKey")
    .map((key, i) => {
      const packages = parsePackages(fd, `pkg_${key}_`);
      return {
        item: { description: str(descriptions[i]) ?? "", quantity: toInt(fd.getAll("itemQuantity")[i]), ...packageTotals(packages) },
        packages,
      };
    })
    .filter((i) => i.item.description);

  // กันเลขออเดอร์ชนกันกรณีสร้างพร้อมกัน
  let newId: number | null = null;
  for (let attempt = 0; attempt < 3 && newId === null; attempt++) {
    try {
      newId = await db.transaction(async (tx) => {
        const [row] = await tx
          .insert(orders)
          .values({ ...fields, code: await nextOrderCode() })
          .returning({ id: orders.id });
        for (const { item, packages } of items) {
          const [created] = await tx.insert(orderItems).values({ ...item, orderId: row.id }).returning({ id: orderItems.id });
          await savePackages(tx, created.id, packages);
        }
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
  await db.transaction(async (tx) => {
    const itemIds = tx.select({ id: orderItems.id }).from(orderItems).where(eq(orderItems.orderId, id));
    await rememberDeletedImports(tx, inArray(itemPackages.itemId, itemIds));
    await tx.delete(itemPackages).where(inArray(itemPackages.itemId, itemIds));
    await tx.delete(orderItems).where(eq(orderItems.orderId, id));
    await tx.delete(orders).where(eq(orders.id, id));
  });
  refresh();
  redirect("/admin/orders");
}

// ---- รายการสินค้า ----

export async function addItem(fd: FormData) {
  await requireUser();
  const description = text(fd, "description");
  if (!description) return;
  const packages = parsePackages(fd, "pkg_");
  await db.transaction(async (tx) => {
    const [created] = await tx
      .insert(orderItems)
      .values({ orderId: Number(fd.get("orderId")), description, quantity: toInt(fd.get("quantity")), ...packageTotals(packages) })
      .returning({ id: orderItems.id });
    await savePackages(tx, created.id, packages);
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
    const packages = parsePackages(fd, "pkg_");
    await savePackages(tx, itemId, packages);
    await tx
      .update(orderItems)
      .set({
        description,
        quantity: toInt(fd.get("quantity")),
        ...packageTotals(packages),
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
  const itemId = Number(fd.get("itemId"));
  await db.transaction(async (tx) => {
    await rememberDeletedImports(tx, eq(itemPackages.itemId, itemId));
    await tx.delete(itemPackages).where(eq(itemPackages.itemId, itemId));
    await tx.delete(orderItems).where(eq(orderItems.id, itemId));
  });
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
