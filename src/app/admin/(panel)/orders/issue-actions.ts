"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { issueFoundAt, issueKinds, issueResponsible, issueStatuses, itemIssues, orderItems } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { syncItemsFromRounds } from "@/lib/rounds";

const pick = <T extends readonly string[]>(list: T, v: FormDataEntryValue | null): T[number] | null =>
  list.includes(String(v)) ? (String(v) as T[number]) : null;
const money = (v: FormDataEntryValue | null) => {
  const n = Number(String(v ?? "").replace(/,/g, ""));
  return String(v ?? "").trim() === "" || !isFinite(n) || n < 0 ? null : Math.round(n * 100) / 100;
};

// บันทึก (เพิ่ม/แก้) ปัญหาสินค้า 1 เรื่อง · คืนข้อความ error หรือ null
export async function saveIssue(_prev: string | null, fd: FormData): Promise<string | null> {
  await requireUser();
  const orderId = Number(fd.get("orderId"));
  const issueId = Number(fd.get("issueId")) || null;
  const itemId = Number(fd.get("itemId"));
  const kind = pick(issueKinds, fd.get("kind"));
  if (!kind) return "เลือกประเภทปัญหา";
  const item = await db.query.orderItems.findFirst({ where: and(eq(orderItems.id, itemId), eq(orderItems.orderId, orderId)) });
  if (!item) return "เลือกรายการสินค้า";
  const boxesRaw = String(fd.get("boxes") ?? "").trim();
  const boxes = boxesRaw === "" ? null : Math.floor(Number(boxesRaw));
  if (boxes != null && (!isFinite(boxes) || boxes < 0)) return "จำนวนกล่องไม่ถูกต้อง";
  if (kind === "lost" && !boxes) return "ใส่จำนวนกล่องที่สูญหาย";

  // กล่องที่มีปัญหา (รวมทุกเรื่องของรายการนี้ ประเภทเดียวกัน) ห้ามเกินจำนวนกล่องของรายการ
  if (item.boxes != null && boxes != null) {
    const others = await db.select().from(itemIssues).where(and(eq(itemIssues.itemId, itemId), eq(itemIssues.kind, kind)));
    const sum = others.filter((o) => o.id !== issueId).reduce((s, o) => s + (o.boxes ?? 0), 0) + boxes;
    if (sum > item.boxes) return `"${item.description}" มี ${item.boxes} กล่อง แต่แจ้งปัญหาประเภทนี้รวม ${sum} กล่อง`;
  }

  const values = {
    orderId,
    itemId,
    kind,
    boxes,
    foundAt: pick(issueFoundAt, fd.get("foundAt")),
    responsible: pick(issueResponsible, fd.get("responsible")) ?? "unknown",
    compensation: money(fd.get("compensation")),
    recovered: money(fd.get("recovered")),
    status: pick(issueStatuses, fd.get("status")) ?? "open",
    note: String(fd.get("note") ?? "").trim() || null,
  };

  await db.transaction(async (tx) => {
    let before: { itemId: number } | undefined;
    if (issueId) {
      [before] = await tx.select({ itemId: itemIssues.itemId }).from(itemIssues).where(and(eq(itemIssues.id, issueId), eq(itemIssues.orderId, orderId)));
      await tx.update(itemIssues).set(values).where(and(eq(itemIssues.id, issueId), eq(itemIssues.orderId, orderId)));
    } else {
      await tx.insert(itemIssues).values(values);
    }
    // กล่องสูญหายเปลี่ยน → คำนวณสถานะจัดส่งจากรอบส่งใหม่
    await syncItemsFromRounds(tx, orderId, new Set([String(itemId), ...(before ? [String(before.itemId)] : [])]));
  });
  revalidatePath("/admin", "layout");
  return null;
}

export async function deleteIssue(orderId: number, issueId: number): Promise<void> {
  await requireUser();
  await db.transaction(async (tx) => {
    const [gone] = await tx
      .delete(itemIssues)
      .where(and(eq(itemIssues.id, issueId), eq(itemIssues.orderId, orderId)))
      .returning({ itemId: itemIssues.itemId });
    if (gone) await syncItemsFromRounds(tx, orderId, new Set([String(gone.itemId)]));
  });
  revalidatePath("/admin", "layout");
}
