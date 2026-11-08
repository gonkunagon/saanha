"use server";

import { and, eq, inArray, isNotNull, type SQL } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { containers, currencies, ignoredImports, itemImages, itemPackages, orderItems, orders, payments, shippingMethods, type Currency, type ShippingMethod } from "@/db/schema";
import { findCustomerById } from "@/lib/customers";
import { clampHandlingPct } from "@/lib/money";
import { getQuoteRate } from "@/lib/settings";
import { requireUser } from "@/lib/auth";
import { parseLocalDateTime } from "@/lib/datetime";
import { joinTracking } from "@/lib/tracking";
import { nextOrderCode, stageOfItem } from "@/lib/orders";
import { calcCbm } from "@/lib/cbm";
import { containerStageFields, itemStages, optionalStages, stageIndex, type ContainerStage, type ItemStage } from "@/lib/stages";

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
// ลิงก์หน้าสินค้า: รับเฉพาะ http(s) — ไม่ใช่ลิงก์ = ไม่บันทึก
const url = (v: FormDataEntryValue | null | undefined) => {
  const s = str(v);
  return s && /^https?:\/\//i.test(s) ? s : null;
};

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
    // น้ำหนักพัสดุเป็นต่อกล่อง → รวม = น้ำหนัก × จำนวนกล่อง
    weightKg: sum(pkgs.map((p) => (p.weightKg == null ? null : p.weightKg * (p.boxes && p.boxes > 0 ? p.boxes : 1))), 2),
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
    purchaseOrderNo: text(fd, "purchaseOrderNo"),
    intlTrackingNo: joinTracking(fd.getAll("intlTrackingNo").map(String)),
    shopName: text(fd, "shopName"),
    hideShopOnQuote: fd.get("hideShopOnQuote") === "1",
    platform: text(fd, "platform"),
    currency: fd.get("currency") === "CNY" ? ("CNY" as const) : ("THB" as const),
    totalAmount: toNum(fd.get("totalAmount")),
    depositAmount: toNum(fd.get("depositAmount")),
    handlingFeePct: clampHandlingPct(fd.get("handlingFeePct")),
    // ฟอร์มที่ไม่มีช่องเรท (เช่น หน้าที่เปิดค้างไว้ก่อนมีช่องนี้) = ไม่แตะค่าเดิม (undefined → drizzle ไม่อัปเดตคอลัมน์)
    orderRate: fd.has("orderRate") ? toNum(fd.get("orderRate")) : undefined,
    method: method(fd),
    provider: text(fd, "provider"),
    note: text(fd, "note"),
    internalNote: text(fd, "internalNote"),
  };
}

// ลูกค้าที่เลือกในฟอร์ม → ชื่อ / เบอร์ / LINE ของออเดอร์ (เก็บสำเนาไว้ในออเดอร์ให้หน้าติดตามพัสดุใช้)
async function selectedCustomer(fd: FormData) {
  const id = toInt(fd.get("customerId"));
  const c = id ? await findCustomerById(id) : undefined;
  return c ? { customerId: c.id, customerName: c.name, customerPhone: c.phone, customerLineId: c.lineId } : null;
}

// สร้างออเดอร์พร้อมรายการสินค้าในฟอร์มเดียว
export async function createOrder(_prev: string | null, fd: FormData): Promise<string | null> {
  await requireUser();
  const customer = await selectedCustomer(fd);
  if (!customer) return "กรุณาเลือกลูกค้า (ยังไม่มีในทะเบียน กด \"+ เพิ่มลูกค้าใหม่\")";
  const fields = { ...orderFields(fd), ...customer };

  // แต่ละแถวสินค้ามี itemKey ใช้จับคู่กับช่องพัสดุของแถวนั้น (pkg_<key>_...)
  const descriptions = fd.getAll("itemDescription");
  const items = fd
    .getAll("itemKey")
    .map((key, i) => {
      const packages = parsePackages(fd, `pkg_${key}_`);
      return {
        item: {
          description: str(descriptions[i]) ?? "",
          productUrl: url(fd.getAll("itemProductUrl")[i]),
          quantity: toInt(fd.getAll("itemQuantity")[i]),
          unitPrice: toNum(fd.getAll("itemUnitPrice")[i]),
          ...packageTotals(packages),
        },
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
          .values({ ...fields, code: await nextOrderCode(tx) })
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
  // ไม่ได้เลือกลูกค้า (ออเดอร์เก่าที่ยังไม่ผูก) = คงชื่อ/เบอร์เดิมไว้
  const customer = await selectedCustomer(fd);
  const id = Number(fd.get("id"));
  const fields = orderFields(fd);
  await db.transaction(async (tx) => {
    await tx
      .update(orders)
      .set({ ...fields, ...customer })
      .where(eq(orders.id, id));
    // พัสดุ + ตู้ ของแต่ละรายการ (ส่งมาพร้อมฟอร์มแก้ไขออเดอร์)
    for (const itemId of fd.getAll("shipItemId").map(Number).filter(Boolean)) {
      const item = await tx.query.orderItems.findFirst({ where: and(eq(orderItems.id, itemId), eq(orderItems.orderId, id)) });
      if (!item) continue;
      const code = text(fd, `containerCode_${itemId}`);
      const container = code ? await findOrCreateContainer(tx, code, fields.method) : null;
      const packages = parsePackages(fd, `pkg_${itemId}_`);
      await savePackages(tx, itemId, packages);
      await tx
        .update(orderItems)
        .set({ ...packageTotals(packages), containerId: container?.id ?? null })
        .where(eq(orderItems.id, itemId));
    }
  });
  refresh();
  redirect(`/admin/orders/${id}`); // บันทึกแล้วกลับไปหน้าแสดงข้อมูล
}

export async function deleteOrder(fd: FormData) {
  await requireUser();
  const id = Number(fd.get("id"));
  await db.transaction(async (tx) => {
    const itemIds = tx.select({ id: orderItems.id }).from(orderItems).where(eq(orderItems.orderId, id));
    await rememberDeletedImports(tx, inArray(itemPackages.itemId, itemIds));
    await tx.delete(itemPackages).where(inArray(itemPackages.itemId, itemIds));
    await tx.delete(itemImages).where(inArray(itemImages.itemId, itemIds));
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
      .values({
        orderId: Number(fd.get("orderId")),
        description,
        spec: text(fd, "spec"),
        productUrl: url(fd.get("productUrl")),
        quantity: toInt(fd.get("quantity")),
        unitPrice: toNum(fd.get("unitPrice")),
        ...packageTotals(packages),
      })
      .returning({ id: orderItems.id });
    await savePackages(tx, created.id, packages);
  });
  refresh();
}

// แก้ไขรายละเอียด/วันที่ของรายการ (ใช้แก้ข้อมูลผิด)
// แก้แค่ราคาต่อหน่วย (ช่องในรายการสินค้าหน้าแก้ไขออเดอร์) — เว้นว่าง = ลบราคา
export async function updateItemPrice(fd: FormData) {
  await requireUser();
  await db.update(orderItems).set({ unitPrice: toNum(fd.get("unitPrice")) }).where(eq(orderItems.id, Number(fd.get("itemId"))));
  refresh();
}

export async function updateItem(fd: FormData) {
  await requireUser();
  const description = text(fd, "description");
  if (!description) return;
  const itemId = Number(fd.get("itemId"));
  await db.transaction(async (tx) => {
    // พัสดุ + ตู้ แก้ที่ฟอร์มแก้ไขออเดอร์ (updateOrder) — ที่นี่แก้แค่ข้อมูลสินค้า
    await tx
      .update(orderItems)
      .set({
        description,
        spec: text(fd, "spec"),
        productUrl: url(fd.get("productUrl")),
        quantity: toInt(fd.get("quantity")),
        unitPrice: toNum(fd.get("unitPrice")),
        // วันที่ของสถานะ + เลขพัสดุในไทย ไม่แก้ที่นี่ (อัปเดตผ่าน applyStage) — ไม่ส่งมา = คงค่าเดิม
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
    await tx.delete(itemImages).where(eq(itemImages.itemId, itemId));
    await tx.delete(orderItems).where(eq(orderItems.id, itemId));
  });
  refresh();
}

// ---- อัปเดตสถานะในขั้นตอนเดียว ----
// พนักงานเลือกรายการ → เลือกสถานะ → บันทึก ระบบจัดการที่เหลือให้:
// - ขั้นก่อนหน้าที่ยังไม่มีวันที่ จะใส่วันที่เดียวกันให้
// - ถ้าใส่เลขตู้ จะย้ายรายการเข้าตู้นั้น (ไม่มีตู้นี้ = สร้างใหม่)
// - ขั้นของตู้ (ปิดตู้ → ถึงโกดังไทย) บันทึกที่ตู้ ออเดอร์อื่นในตู้เดียวกันจึงเปลี่ยนตามด้วย
// - ย้อนสถานะได้: วันที่ของขั้นหลังจากนั้นถูกล้าง
//   · ย้อนไปก่อนขึ้นตู้ (ผลิต / ถึงโกดังจีน) = นำรายการออกจากตู้
//   · ย้อนขั้นของตู้ = ล้างวันที่ของตู้ขั้นหลังจากนั้น (เฉพาะเมื่อรายการที่เลือกทุกรายการในตู้นั้นอยู่เลยขั้นที่เลือกไปแล้ว
//     กันกรณีเพิ่มรายการใหม่เข้าตู้ที่ไปไกลกว่าแล้วทำให้ตู้ถอยหลังโดยไม่ตั้งใจ)

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
    with: { items: { with: { container: true } } },
  });
  if (!order) return "ไม่พบออเดอร์";
  const items = order.items.filter((i) => itemIds.includes(i.id));
  const beforeContainer = !reached("loaded");

  if (!beforeContainer && !containerCode && items.some((i) => !i.containerId)) {
    return "มีรายการที่ยังไม่เข้าตู้ กรุณาใส่เลขตู้";
  }

  // ตู้ที่จะถูกย้อนสถานะ: ทุกรายการที่เลือกในตู้นั้นอยู่เลยขั้นที่เลือกไปแล้ว
  const rewindContainers = new Set<number>();
  if (!beforeContainer && !containerCode) {
    for (const cid of new Set(items.map((i) => i.containerId).filter((v): v is number => Boolean(v)))) {
      const inside = items.filter((i) => i.containerId === cid);
      if (inside.every((i) => stageIndex(stageOfItem(i)) > idx)) rewindContainers.add(cid);
    }
  }

  await db.transaction(async (tx) => {
    const target = containerCode ? await findOrCreateContainer(tx, containerCode, order.method) : null;

    for (const item of items) {
      // ขั้นที่เลือก = วันที่ใหม่ · ขั้นก่อนหน้าที่ว่าง = เติมให้ (ยกเว้นขั้นที่ข้ามได้) · ขั้นหลังจากนั้น = ล้าง
      const set = (s: ItemStage, current: Date | null) =>
        s === stage ? at : reached(s) ? current ?? (optionalStages.has(s) ? null : at) : null;
      await tx
        .update(orderItems)
        .set({
          // ย้อนไปก่อนขึ้นตู้ = ยังไม่ได้อยู่ในตู้ไหน
          containerId: beforeContainer ? null : target?.id ?? item.containerId,
          productionAt: set("in_production", item.productionAt),
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
        const update: Partial<Record<(typeof containerStageFields)[ContainerStage], Date | null>> = {};
        for (const [s, field] of Object.entries(containerStageFields) as [ContainerStage, (typeof containerStageFields)[ContainerStage]][]) {
          if (s === stage) update[field] = at;
          else if (reached(s) && !c[field]) update[field] = at;
          else if (!reached(s) && c[field] && rewindContainers.has(cid)) update[field] = null; // ย้อนสถานะตู้
        }
        if (Object.keys(update).length) await tx.update(containers).set(update).where(eq(containers.id, cid));
      }
    }
  });

  refresh();
  return null;
}

// บันทึกการชำระเงินที่ลูกค้าโอนมา (ยอด วันที่ ช่องทาง) — 1 ออเดอร์บันทึกได้หลายครั้ง
export async function addPayment(fd: FormData) {
  await requireUser();
  const orderId = Number(fd.get("orderId"));
  const amount = toNum(fd.get("amount"));
  const paymentMethod = text(fd, "method");
  if (!orderId || amount == null || amount <= 0 || !paymentMethod) return;
  const order = await db.query.orders.findFirst({ where: eq(orders.id, orderId), columns: { currency: true } });
  if (!order) return;
  const c = String(fd.get("currency"));
  const currency: Currency = (currencies as readonly string[]).includes(c) ? (c as Currency) : "THB";
  // ยอดที่คิดเป็นสกุลของออเดอร์: สกุลเดียวกันใช้ยอดเดิม · คนละสกุลแปลงด้วยเรทที่กรอกเอง หรือเรทใบเสนอราคาของวันนี้
  let appliedAmount = amount;
  let rate: number | null = null;
  if (currency !== order.currency) {
    const manual = toNum(fd.get("rate"));
    rate = manual != null && manual > 0 ? manual : (await getQuoteRate()).rate;
    if (!rate) return; // ไม่มีเรทวันนี้และไม่ได้กรอกเรท — บันทึกไม่ได้
    rate = Math.round(rate * 10000) / 10000;
    appliedAmount = convertPaid(amount, currency, rate);
  }
  await db.insert(payments).values({
    orderId,
    amount,
    currency,
    appliedAmount,
    rate,
    paidAt: parseLocalDateTime(fd.get("paidAt")) ?? new Date(),
    method: paymentMethod,
    bank: text(fd, "bank"),
  });
  refresh();
}

// ยอดโอน → สกุลของออเดอร์ (rate = บาทต่อ 1 หยวน)
const convertPaid = (amount: number, currency: Currency, rate: number) =>
  Math.round((currency === "THB" ? amount / rate : amount * rate) * 100) / 100;

// แก้เรทของรายการที่โอนคนละสกุล แล้วคำนวณยอดที่คิดเป็นสกุลออเดอร์ใหม่
export async function updatePaymentRate(fd: FormData) {
  await requireUser();
  const rate = toNum(fd.get("rate"));
  if (rate == null || rate <= 0) return;
  const payment = await db.query.payments.findFirst({ where: eq(payments.id, Number(fd.get("paymentId"))) });
  if (!payment || payment.rate == null) return;
  const r = Math.round(rate * 10000) / 10000;
  await db
    .update(payments)
    .set({ rate: r, appliedAmount: convertPaid(payment.amount, payment.currency, r) })
    .where(eq(payments.id, payment.id));
  refresh();
}

export async function deletePayment(fd: FormData) {
  await requireUser();
  await db.delete(payments).where(eq(payments.id, Number(fd.get("paymentId"))));
  refresh();
}
