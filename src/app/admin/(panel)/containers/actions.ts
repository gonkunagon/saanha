"use server";

import { and, eq, inArray, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { containers, orderItems, orders, shippingMethods, type ShippingMethod } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { parseLocalDateTime } from "@/lib/datetime";
import { containerStageFields, containerStages, type ContainerStage } from "@/lib/stages";

const text = (fd: FormData, key: string) => String(fd.get(key) ?? "").trim() || null;
const method = (fd: FormData): ShippingMethod => {
  const m = String(fd.get("method"));
  return (shippingMethods as readonly string[]).includes(m) ? (m as ShippingMethod) : "truck";
};

const costPerCbm = (fd: FormData) => {
  const v = parseFloat(String(fd.get("costPerCbm") ?? ""));
  return Number.isFinite(v) && v >= 0 ? v : null;
};

// ตู้เปลี่ยน = ออเดอร์ทุกใบในตู้เปลี่ยนตาม จึงรีเฟรชทั้งหลังบ้าน
const refresh = () => revalidatePath("/admin", "layout");

export async function createContainer(_prev: string | null, fd: FormData): Promise<string | null> {
  await requireUser();
  const code = text(fd, "code")?.toUpperCase();
  if (!code) return "กรุณาใส่เลขตู้";
  if (await db.query.containers.findFirst({ where: eq(containers.code, code) })) return "เลขตู้นี้มีอยู่แล้ว";
  const [row] = await db
    .insert(containers)
    .values({ code, method: method(fd), provider: text(fd, "provider") })
    .returning({ id: containers.id });
  refresh();
  redirect(`/admin/containers/${row.id}`);
}

export async function updateContainer(fd: FormData) {
  await requireUser();
  const id = Number(fd.get("id"));
  const code = text(fd, "code")?.toUpperCase();
  if (!code) return;
  await db
    .update(containers)
    .set({ code, method: method(fd), provider: text(fd, "provider"), note: text(fd, "note"), costPerCbm: costPerCbm(fd) })
    .where(eq(containers.id, id));
  refresh();
}

export async function setContainerStage(fd: FormData) {
  await requireUser();
  const id = Number(fd.get("id"));
  const stage = String(fd.get("stage")) as ContainerStage;
  const field = containerStageFields[stage];
  if (!field) return;
  const value = fd.get("clear") ? null : parseLocalDateTime(fd.get("at"));
  await db.update(containers).set({ [field]: value }).where(eq(containers.id, id));
  refresh();
}

// อัปเดตสถานะทั้งตู้ในฟอร์มเดียว — ทุกออเดอร์ในตู้เปลี่ยนตาม
// - ขั้นของตู้ (โหลด → ถึงโกดังไทย): บันทึกที่ตู้ ขั้นก่อนหน้าที่ยังว่างเติมวันเดียวกันให้
// - กำลังจัดส่ง / จัดส่งสำเร็จ: บันทึกให้ทุกรายการในตู้ที่ยังไม่มีวันที่ (และเติมขั้นของตู้ที่ยังว่าง)
const deliveryFields = { out_for_delivery: ["outForDeliveryAt"], delivered: ["outForDeliveryAt", "deliveredAt"] } as const;

export async function setContainerStatus(fd: FormData) {
  await requireUser();
  const id = Number(fd.get("id"));
  const stage = String(fd.get("stage"));
  const at = parseLocalDateTime(fd.get("at"));
  if (!at) return;
  const container = await db.query.containers.findFirst({ where: eq(containers.id, id) });
  if (!container) return;

  const upTo = stage in containerStageFields ? containerStages.indexOf(stage as ContainerStage) : containerStages.length - 1;
  const fill: Partial<typeof containers.$inferInsert> = {};
  containerStages.slice(0, upTo + 1).forEach((s) => {
    const field = containerStageFields[s];
    if (!container[field] || s === stage) fill[field] = at;
  });

  await db.transaction(async (tx) => {
    // ขั้นของตู้ครบทุกวันแล้ว (เช่น อัปเดตเป็นกำลังจัดส่ง) = ไม่มีอะไรต้องแก้ที่ตู้ — update ว่าง drizzle จะ error
    if (Object.keys(fill).length) await tx.update(containers).set(fill).where(eq(containers.id, id));
    if (stage in deliveryFields) {
      for (const field of deliveryFields[stage as keyof typeof deliveryFields]) {
        await tx
          .update(orderItems)
          .set({ [field]: at })
          .where(and(eq(orderItems.containerId, id), isNull(orderItems[field])));
      }
    }
  });
  refresh();
}

// เพิ่มทั้งออเดอร์เข้าตู้: รายการของออเดอร์ที่ยังไม่อยู่ตู้ไหนและยังไม่ส่งถึงลูกค้า
export async function addOrdersToContainer(fd: FormData) {
  await requireUser();
  const id = Number(fd.get("id"));
  const orderIds = fd.getAll("orderId").map(Number).filter(Boolean);
  if (orderIds.length === 0) return;
  await db
    .update(orderItems)
    .set({ containerId: id })
    .where(and(inArray(orderItems.orderId, orderIds), isNull(orderItems.containerId), isNull(orderItems.deliveredAt)));
  refresh();
}

export async function removeOrderFromContainer(fd: FormData) {
  await requireUser();
  await db
    .update(orderItems)
    .set({ containerId: null })
    .where(and(eq(orderItems.orderId, Number(fd.get("orderId"))), eq(orderItems.containerId, Number(fd.get("id")))));
  refresh();
}

export async function deleteContainer(fd: FormData) {
  await requireUser();
  const id = Number(fd.get("id"));
  // ลบได้เฉพาะตู้ว่าง กันลบผิดแล้วออเดอร์หายจากตู้
  const inside = await db.query.orderItems.findFirst({ where: eq(orderItems.containerId, id) });
  if (inside) return;
  await db.delete(containers).where(eq(containers.id, id));
  refresh();
  redirect("/admin/containers");
}

// เรทค่าขนส่ง (บาท / คิว) ของออเดอร์ — เว้นว่าง = กลับไปใช้เรทมาตรฐาน
export async function updateOrderShippingRate(fd: FormData) {
  await requireUser();
  const v = parseFloat(String(fd.get("shippingRate") ?? ""));
  const rate = Number.isFinite(v) && v >= 0 ? Math.round(v * 100) / 100 : null;
  await db.update(orders).set({ shippingRate: rate }).where(eq(orders.id, Number(fd.get("orderId"))));
  refresh();
}
