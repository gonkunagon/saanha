import { desc, like } from "drizzle-orm";
import { db } from "@/db";
import { orders, type Container, type OrderItem } from "@/db/schema";
import {
  containerStageFields,
  containerStages,
  currentStage,
  itemStageDates,
  optionalStages,
  slowestStage,
  type ContainerStage,
  type ItemStage,
} from "./stages";

export type ItemWithContainer = OrderItem & { container: Container | null };

export const stageOfItem = (item: ItemWithContainer) => currentStage(itemStageDates(item, item.container));

export function summarizeOrder(items: ItemWithContainer[]) {
  const stages = items.map(stageOfItem);
  return {
    stage: slowestStage(stages),
    itemCount: items.length,
    deliveredCount: stages.filter((s) => s === "delivered").length,
    containerCount: new Set(items.map((i) => i.containerId).filter(Boolean)).size,
  };
}

// สถานะล่าสุดของตู้ (null = ยังเปิดตู้ รอโหลดสินค้า)
export function containerStageOf(c: Container): ContainerStage | null {
  let stage: ContainerStage | null = null;
  for (const s of containerStages) if (c[containerStageFields[s]]) stage = s;
  return stage;
}

// ขั้นส่งต่อลูกค้าของตู้ (เก็บที่รายการสินค้า): วันที่ = รายการสุดท้ายที่ได้ขั้นนั้น เมื่อทุกรายการในตู้ได้แล้ว · done = จำนวนรายการที่ได้แล้ว
type DeliveryDates = { outForDeliveryAt: Date | null; deliveredAt: Date | null };
export function containerDeliveryOf(items: DeliveryDates[]) {
  const of = (pick: (i: DeliveryDates) => Date | null) => {
    const dates = items.map(pick).filter((d): d is Date => d != null);
    const at = items.length > 0 && dates.length === items.length ? new Date(Math.max(...dates.map((d) => d.getTime()))) : null;
    return { at, done: dates.length, total: items.length };
  };
  return { out_for_delivery: of((i) => i.outForDeliveryAt ?? i.deliveredAt), delivered: of((i) => i.deliveredAt) };
}

// สถานะที่แสดงของตู้ = ขั้นของตู้ หรือขั้นส่งต่อลูกค้า เมื่อทุกรายการในตู้ไปถึงแล้ว
export function containerDisplayStage(c: Container, items: DeliveryDates[]): ItemStage | null {
  const d = containerDeliveryOf(items);
  return d.delivered.at ? "delivered" : d.out_for_delivery.at ? "out_for_delivery" : containerStageOf(c);
}

// เลขออเดอร์อัตโนมัติ เช่น SH2611-0001 (ปี-เดือน ตามเวลาไทย + ลำดับในเดือน)
// ออเดอร์ฝากส่งอย่างเดียวใช้ FS (นับลำดับแยกจาก SH)
// q = transaction ที่กำลังทำอยู่ (ถ้ามี) — ห้ามใช้ db ตรงๆ ใน transaction เพราะบน Vercel มีการเชื่อมต่อเดียว จะค้างรอกันเอง
export const orderCodePrefix = (shippingOnly: boolean | null | undefined) => (shippingOnly ? "FS" : "SH");
export async function nextOrderCode(q: Pick<typeof db, "select"> = db, kind: "SH" | "FS" = "SH") {
  const bkk = new Date(Date.now() + 7 * 3600_000);
  const prefix = `${kind}${String(bkk.getUTCFullYear()).slice(2)}${String(bkk.getUTCMonth() + 1).padStart(2, "0")}-`;
  const [last] = await q
    .select({ code: orders.code })
    .from(orders)
    .where(like(orders.code, `${prefix}%`))
    .orderBy(desc(orders.code))
    .limit(1);
  const seq = last ? Number(last.code.slice(prefix.length)) + 1 : 1;
  return `${prefix}${String(seq).padStart(4, "0")}`;
}

// ---- ข้อมูลสำหรับหน้าติดตามพัสดุของลูกค้า ----

// เลขพัสดุขนส่งในไทย (domesticTracking) ใช้ภายในเท่านั้น ไม่ส่งให้หน้าติดตามพัสดุของลูกค้า
export type TrackingGroup = {
  container: { code: string; method: string } | null; // null = ยังไม่ได้เข้าตู้
  items: { description: string; quantity: number | null; boxes: number | null }[];
  stages: { stage: ItemStage; at: string | null }[];
};

export type TrackingView = {
  code: string;
  method: string;
  stage: ItemStage;
  itemCount: number;
  deliveredCount: number;
  note: string | null;
  groups: TrackingGroup[];
};

const last4 = (s: string) => s.replace(/\D/g, "").slice(-4);

export async function getTrackingView(code: string, phoneLast4: string): Promise<TrackingView | null> {
  const order = await db.query.orders.findFirst({
    where: (o, { eq }) => eq(o.code, code.replace(/\s+/g, "").toUpperCase()),
    with: { items: { with: { container: true } } },
  });
  // เทียบเบอร์ 4 ตัวท้าย เพื่อไม่ให้คนอื่นดูข้อมูลได้จากเลขออเดอร์อย่างเดียว
  // ออเดอร์ที่ยังไม่มีเบอร์ (เช่น นำเข้าจาก JJ) ดูไม่ได้เลยจนกว่าจะใส่เบอร์
  const phone4 = order ? last4(order.customerPhone) : "";
  if (!order || phone4.length < 4 || phone4 !== phoneLast4) return null;

  // จัดกลุ่มรายการตามตู้ ขั้นใดจะถือว่าเสร็จเมื่อทุกรายการในกลุ่มผ่านขั้นนั้นแล้ว
  const byContainer = new Map<number | null, ItemWithContainer[]>();
  for (const item of order.items) {
    const key = item.containerId ?? null;
    byContainer.set(key, [...(byContainer.get(key) ?? []), item]);
  }

  const groups: TrackingGroup[] = [...byContainer.values()].map((items) => {
    const allDates = items.map((i) => itemStageDates(i, i.container));
    const stages = (Object.keys(allDates[0]) as ItemStage[])
      // ขั้นที่ข้ามได้ (อยู่ระหว่างการผลิต) แสดงเฉพาะกลุ่มที่ใช้ขั้นนั้นจริง
      .filter((stage) => !optionalStages.has(stage) || allDates.some((d) => d[stage]))
      .map((stage) => {
        // ขั้นที่ข้ามได้: นับว่าผ่านเมื่อมีรายการใดใช้ขั้นนั้น (สินค้าสำเร็จรูปในกลุ่มเดียวกันไม่ต้องผลิต)
        const dates = allDates.map((d) => d[stage]).filter((d) => optionalStages.has(stage) ? d : true);
        const done = dates.length > 0 && dates.every(Boolean);
        const latest = done ? new Date(Math.max(...dates.map((d) => d!.getTime()))) : null;
        return { stage, at: latest?.toISOString() ?? null };
      });
    const container = items[0].container;
    return {
      container: container ? { code: container.code, method: container.method } : null,
      items: items.map((i) => ({ description: i.description, quantity: i.quantity, boxes: i.boxes })),
      stages,
    };
  });
  // กลุ่มที่ยังไม่เข้าตู้ไว้ท้ายสุด
  groups.sort((a, b) => Number(a.container === null) - Number(b.container === null));

  const summary = summarizeOrder(order.items);
  return {
    code: order.code,
    method: order.method,
    stage: summary.stage,
    itemCount: summary.itemCount,
    deliveredCount: summary.deliveredCount,
    note: order.note,
    groups,
  };
}
