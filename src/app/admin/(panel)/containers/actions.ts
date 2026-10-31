"use server";

import { and, eq, inArray, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { containers, orderItems, shippingMethods, type ShippingMethod } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { parseLocalDateTime } from "@/lib/datetime";
import { containerStageFields, type ContainerStage } from "@/lib/stages";

const text = (fd: FormData, key: string) => String(fd.get(key) ?? "").trim() || null;
const method = (fd: FormData): ShippingMethod => {
  const m = String(fd.get("method"));
  return (shippingMethods as readonly string[]).includes(m) ? (m as ShippingMethod) : "truck";
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
    .values({ code, method: method(fd), provider: text(fd, "provider"), externalId: text(fd, "externalId") })
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
    .set({ code, method: method(fd), provider: text(fd, "provider"), externalId: text(fd, "externalId"), note: text(fd, "note") })
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

export async function addItemsToContainer(fd: FormData) {
  await requireUser();
  const id = Number(fd.get("id"));
  const itemIds = fd.getAll("itemId").map(Number).filter(Boolean);
  if (itemIds.length === 0) return;
  await db
    .update(orderItems)
    .set({ containerId: id })
    .where(and(inArray(orderItems.id, itemIds), isNull(orderItems.containerId)));
  refresh();
}

export async function removeItemFromContainer(fd: FormData) {
  await requireUser();
  await db.update(orderItems).set({ containerId: null }).where(eq(orderItems.id, Number(fd.get("itemId"))));
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
