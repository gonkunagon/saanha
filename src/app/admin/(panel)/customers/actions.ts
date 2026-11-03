"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { customers, orders } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { findCustomerByCode, findCustomerByPhone, nextCustomerCode } from "@/lib/customers";

export type CustomerFormState = { error?: string; ok?: string } | null;

const text = (fd: FormData, key: string) => String(fd.get(key) ?? "").trim() || null;

type CustomerInput = {
  code: string | null;
  name: string;
  firstName: string | null;
  lastName: string | null;
  phone: string;
  lineId: string | null;
  address: string | null;
  note: string | null;
};

function customerFields(fd: FormData): CustomerInput {
  return {
    code: text(fd, "code")?.toUpperCase() ?? null,
    name: text(fd, "name") ?? "",
    firstName: text(fd, "firstName"),
    lastName: text(fd, "lastName"),
    phone: text(fd, "phone") ?? "",
    lineId: text(fd, "lineId"),
    address: text(fd, "address"),
    note: text(fd, "note"),
  };
}

// ตรวจข้อมูล + กันเบอร์ซ้ำ (ลูกค้า 1 คน = 1 เบอร์) + กันรหัสลูกค้าซ้ำ — เบอร์ไม่บังคับ แต่ถ้าใส่ต้องถูกต้อง
async function validate(fields: CustomerInput, selfId?: number): Promise<string | null> {
  if (!fields.name) return "กรุณาใส่ชื่อลูกค้า";
  if (fields.phone && fields.phone.replace(/\D/g, "").length < 4) return "เบอร์โทรไม่ถูกต้อง (เว้นว่างได้)";
  if (fields.code && !/^[A-Z0-9_-]{1,20}$/.test(fields.code)) return "รหัสลูกค้าใช้ได้เฉพาะ A-Z, 0-9, - _ (ไม่เกิน 20 ตัว)";
  const dupPhone = fields.phone ? await findCustomerByPhone(fields.phone) : undefined;
  if (dupPhone && dupPhone.id !== selfId) return `เบอร์นี้เป็นของลูกค้า ${dupPhone.name} อยู่แล้ว`;
  if (fields.code) {
    const dupCode = await findCustomerByCode(fields.code);
    if (dupCode && dupCode.id !== selfId) return `รหัส ${fields.code} เป็นของลูกค้า ${dupCode.name} อยู่แล้ว`;
  }
  return null;
}

// เว้นรหัสว่าง = ระบบออกรหัสถัดไปให้ (C0001, C0002, …)
const withCode = async (fields: CustomerInput) => ({ ...fields, code: fields.code ?? (await nextCustomerCode()) });

export async function createCustomer(_prev: CustomerFormState, fd: FormData): Promise<CustomerFormState> {
  await requireUser();
  const fields = customerFields(fd);
  const error = await validate(fields);
  if (error) return { error };
  const row = await withCode(fields);
  await db.insert(customers).values(row);
  revalidatePath("/admin", "layout");
  return { ok: `เพิ่มลูกค้า ${row.name} (${row.code}) แล้ว` };
}

export async function updateCustomer(_prev: CustomerFormState, fd: FormData): Promise<CustomerFormState> {
  await requireUser();
  const id = Number(fd.get("id"));
  const fields = customerFields(fd);
  const error = await validate(fields, id);
  if (error) return { error };
  const row = await withCode(fields);
  await db.transaction(async (tx) => {
    await tx.update(customers).set(row).where(eq(customers.id, id));
    // ออเดอร์ที่ผูกกับลูกค้านี้ใช้ชื่อ/เบอร์ล่าสุดตาม (หน้าติดตามพัสดุใช้เบอร์ในออเดอร์)
    await tx
      .update(orders)
      .set({ customerName: row.name, customerPhone: row.phone, customerLineId: row.lineId })
      .where(eq(orders.customerId, id));
  });
  revalidatePath("/admin", "layout");
  return { ok: "บันทึกแล้ว" };
}

// เพิ่มลูกค้าจากหน้าสร้างออเดอร์ (ไม่ต้องออกจากหน้า) — คืนข้อมูลลูกค้าให้ช่องเลือกลูกค้าเลือกต่อทันที
export async function quickCreateCustomer(input: { code: string; name: string; phone: string; lineId: string }) {
  await requireUser();
  const fields: CustomerInput = {
    code: input.code.trim().toUpperCase() || null,
    name: input.name.trim(),
    firstName: null,
    lastName: null,
    phone: input.phone.trim(),
    lineId: input.lineId.trim() || null,
    address: null,
    note: null,
  };
  const error = await validate(fields);
  if (error) return { error };
  const [customer] = await db
    .insert(customers)
    .values(await withCode(fields))
    .returning({ id: customers.id, code: customers.code, name: customers.name, phone: customers.phone, lineId: customers.lineId });
  revalidatePath("/admin/customers");
  return { customer };
}

// ลบลูกค้า — ออเดอร์เดิมยังอยู่ครบ (ชื่อ/เบอร์เก็บไว้ในออเดอร์แล้ว) แค่ไม่ผูกกับลูกค้าคนนี้อีก
export async function deleteCustomer(fd: FormData) {
  await requireUser();
  const id = Number(fd.get("id"));
  await db.transaction(async (tx) => {
    await tx.update(orders).set({ customerId: null }).where(eq(orders.customerId, id));
    await tx.delete(customers).where(eq(customers.id, id));
  });
  revalidatePath("/admin", "layout");
  redirect("/admin/customers");
}
