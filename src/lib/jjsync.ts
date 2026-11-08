import { eq, like } from "drizzle-orm";
import { db } from "@/db";
import { containers, ignoredImports, itemPackages, orderItems, orders, type ShippingMethod } from "@/db/schema";
import { calcCbm } from "./cbm";
import { nextOrderCode } from "./orders";
import { fetchJjSnapshot, type JjSnapshot, type JjSnapshotParcel } from "./jjcargo";

// ซิงค์ข้อมูลจาก JJ Cargo เข้าหลังบ้าน SAANHA
// - ลูกค้าเดียวกัน + ออเดอร์ JJ เดียวกัน + รับเข้าโกดังจีนวันเดียวกัน = 1 ออเดอร์
// - 1 เลขแทรคต่อ 1 รอบขนส่ง = 1 รายการ (ออเดอร์เดียวจึงกระจายหลายตู้ได้)
// - 1 PackingList ของ JJ = 1 พัสดุ (1 กล่อง)
// - รอบขนส่งของ JJ = ตู้ชื่อเดียวกัน วันที่ของตู้เติมเฉพาะช่องที่ยังว่าง (ไม่ทับที่พนักงานแก้เอง)
// รันซ้ำได้: ทุกแถวมี import_key กันสร้างซ้ำ พัสดุที่เคยนำเข้าแล้วจะถูกอัปเดตน้ำหนัก/ขนาด/ตู้

export const JJ_PROVIDER = "JJ Cargo";

export type SyncResult = {
  ordersCreated: number;
  itemsCreated: number;
  packagesCreated: number;
  packagesUpdated: number;
  containersCreated: number;
  containersUpdated: number;
};

const utc = (s: string) => new Date(`${s.replace(" ", "T")}Z`);
const bkkDay = (s: string) => new Date(utc(s).getTime() + 7 * 3600_000).toISOString().slice(0, 10);
const bkkMidnight = (day: string) => new Date(`${day}T00:00:00+07:00`);

// สถานะการซิงค์ล่าสุด (เก็บในหน่วยความจำของเซิร์ฟเวอร์ แสดงในหน้าออเดอร์)
export type SyncStatus = {
  running: boolean;
  lastAt: string | null;
  lastResult: SyncResult | null;
  lastError: string | null;
  autoEveryMinutes: number | null;
};
const g = globalThis as unknown as { jjSync?: { status: SyncStatus; current: Promise<SyncResult> | null } };
g.jjSync ??= {
  status: { running: false, lastAt: null, lastResult: null, lastError: null, autoEveryMinutes: null },
  current: null,
};
export const getSyncStatus = (): SyncStatus => ({ ...g.jjSync!.status });
export const setAutoSyncMinutes = (m: number | null) => (g.jjSync!.status.autoEveryMinutes = m);

// ดึงข้อมูลจาก JJ แล้วนำเข้า — ใช้ทั้งปุ่มในหลังบ้าน ซิงค์อัตโนมัติ และ cron
// ถ้ามีการซิงค์ค้างอยู่ (เช่น กดปุ่มตอนระบบกำลังซิงค์อัตโนมัติ) จะรอผลรอบเดิม ไม่รันซ้อน
export function runJjSync(): Promise<SyncResult> {
  const state = g.jjSync!;
  if (state.current) return state.current;
  state.status.running = true;
  state.current = (async () => {
    try {
      const snapshot = await fetchJjSnapshot(await knownJjParcelIds());
      const method: ShippingMethod = process.env.JJ_CARGO_METHOD === "sea" ? "sea" : "truck";
      const result = await applyJjSnapshot(snapshot, { method });
      Object.assign(state.status, { lastResult: result, lastError: null });
      return result;
    } catch (err) {
      state.status.lastError = err instanceof Error ? err.message : String(err);
      throw err;
    } finally {
      Object.assign(state.status, { running: false, lastAt: new Date().toISOString() });
      state.current = null;
    }
  })();
  return state.current;
}

// PackingList id ที่นำเข้าแล้ว หรือถูกลบทิ้งไปแล้ว — ไม่ต้องเปิดหน้ารายละเอียดใน JJ ซ้ำ
export async function knownJjParcelIds(): Promise<Set<number>> {
  const [imported, ignored] = await Promise.all([
    db.select({ key: itemPackages.importKey }).from(itemPackages).where(like(itemPackages.importKey, "jj:%")),
    db.select({ key: ignoredImports.importKey }).from(ignoredImports).where(like(ignoredImports.importKey, "jj:%")),
  ]);
  return new Set([...imported, ...ignored].map((r) => Number(r.key!.slice(3))));
}

function packageValues(p: JjSnapshotParcel) {
  return {
    chinaTrackingNo: p.trackingNo,
    boxes: 1,
    weightKg: p.weightKg,
    widthCm: p.widthCm,
    lengthCm: p.lengthCm,
    heightCm: p.heightCm,
    cbm: calcCbm(p.widthCm, p.lengthCm, p.heightCm, 1),
  };
}

export async function applyJjSnapshot(
  snap: JjSnapshot,
  { method = "truck", today = new Date() }: { method?: ShippingMethod; today?: Date } = {},
): Promise<SyncResult> {
  const result: SyncResult = {
    ordersCreated: 0,
    itemsCreated: 0,
    packagesCreated: 0,
    packagesUpdated: 0,
    containersCreated: 0,
    containersUpdated: 0,
  };
  const customers = new Map(snap.customers.map((c) => [c.id, c]));
  const shipments = new Map(snap.shipments.map((s) => [s.code, s]));
  // พัสดุที่พนักงานลบทิ้งแล้ว ไม่ดึงกลับมา
  const ignored = new Set(
    (await db.select({ key: ignoredImports.importKey }).from(ignoredImports)).map((r) => r.key),
  );
  const parcels = [...snap.parcels].filter((p) => !ignored.has(`jj:${p.id}`)).sort((a, b) => a.id - b.id);

  // 1) ตู้ตามรอบขนส่ง
  const containerIdByCode = new Map<string, number>();
  for (const code of new Set(parcels.map((p) => p.shipmentCode).filter((c): c is string => Boolean(c)))) {
    const shipment = shipments.get(code);
    const offChina = parcels.filter((p) => p.shipmentCode === code && p.offChinaDate).map((p) => p.offChinaDate!).sort().at(-1);
    let container = await db.query.containers.findFirst({ where: eq(containers.code, code) });
    if (!container) {
      [container] = await db.insert(containers).values({ code, method, provider: JJ_PROVIDER }).returning();
      result.containersCreated++;
    }
    // วันถึงไทยที่ยังไม่มาถึง = วันคาดการณ์ ยังไม่บันทึกว่าถึงแล้ว
    const arrived = shipment?.arrivedDate && bkkMidnight(shipment.arrivedDate) <= today ? shipment.arrivedDate : null;
    const fill: Partial<typeof containers.$inferInsert> = {};
    if (!container.loadedAt && shipment?.date) fill.loadedAt = bkkMidnight(shipment.date);
    if (!container.departedAt && offChina) fill.departedAt = bkkMidnight(offChina);
    if (!container.arrivedAt && arrived) fill.arrivedAt = bkkMidnight(arrived);
    if (Object.keys(fill).length) {
      await db.update(containers).set(fill).where(eq(containers.id, container.id));
      result.containersUpdated++;
    }
    containerIdByCode.set(code, container.id);
  }

  // 2) พัสดุ → ออเดอร์ / รายการ / พัสดุย่อย
  const touchedItems = new Set<number>();
  for (const p of parcels) {
    const pkgKey = `jj:${p.id}`;
    const containerId = p.shipmentCode ? containerIdByCode.get(p.shipmentCode) ?? null : null;
    const existing = await db.query.itemPackages.findFirst({ where: eq(itemPackages.importKey, pkgKey) });

    if (existing) {
      await db.update(itemPackages).set(packageValues(p)).where(eq(itemPackages.id, existing.id));
      result.packagesUpdated++;
      // JJ จัดเข้ารอบขนส่งแล้ว → ย้ายรายการเข้าตู้นั้น (JJ ยังไม่จัดรอบ = ไม่แตะตู้ที่พนักงานเลือกไว้)
      if (containerId) await db.update(orderItems).set({ containerId }).where(eq(orderItems.id, existing.itemId));
      touchedItems.add(existing.itemId);
      continue;
    }

    const customer = customers.get(p.customerId);
    const receivedDay = bkkDay(p.createdAt);
    const orderKey = `jj:c${p.customerId}:o${p.jjOrderId ?? 0}:d${receivedDay}`;
    let order = await db.query.orders.findFirst({ where: eq(orders.importKey, orderKey) });
    if (!order) {
      [order] = await db
        .insert(orders)
        .values({
          code: await nextOrderCode(),
          importKey: orderKey,
          customerName: customer ? `${customer.name} (${customer.code})` : `ลูกค้า JJ #${p.customerId}`,
          customerPhone: customer?.phone?.trim() ?? "",
          method,
          provider: JJ_PROVIDER,
          externalId: p.jjOrderId ? `JJ order #${p.jjOrderId}` : null,
          internalNote: `นำเข้าจาก JJ Cargo (ลูกค้า ${customer?.code ?? p.customerId}, รับเข้า ${receivedDay})`,
        })
        .returning();
      result.ordersCreated++;
    }

    const itemKey = `${orderKey}:t${p.trackingNo ?? p.packingCode}:s${p.shipmentCode ?? "-"}`;
    let item = await db.query.orderItems.findFirst({ where: eq(orderItems.importKey, itemKey) });
    if (!item) {
      [item] = await db
        .insert(orderItems)
        .values({
          orderId: order.id,
          importKey: itemKey,
          description: p.description ?? (p.trackingNo ? `พัสดุ ${p.trackingNo}` : p.packingCode),
          containerId,
          receivedAt: utc(p.createdAt),
        })
        .returning();
      result.itemsCreated++;
    }

    await db.insert(itemPackages).values({ ...packageValues(p), itemId: item.id, importKey: pkgKey });
    result.packagesCreated++;
    touchedItems.add(item.id);
  }

  // 3) ยอดรวมของรายการ = ผลรวมพัสดุ
  for (const itemId of touchedItems) {
    const pkgs = await db.select().from(itemPackages).where(eq(itemPackages.itemId, itemId));
    const sum = (vals: (number | null)[], digits: number) =>
      vals.some((v) => v != null)
        ? Math.round(vals.reduce<number>((s, v) => s + (v ?? 0), 0) * 10 ** digits) / 10 ** digits
        : null;
    await db
      .update(orderItems)
      .set({
        boxes: sum(pkgs.map((x) => x.boxes), 0),
        weightKg: sum(pkgs.map((x) => (x.weightKg == null ? null : x.weightKg * (x.boxes && x.boxes > 0 ? x.boxes : 1))), 2),
        cbm: sum(pkgs.map((x) => x.cbm), 4),
      })
      .where(eq(orderItems.id, itemId));
  }

  return result;
}
