"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { userRoles, users, type UserRole } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { hashPassword } from "@/lib/password";

// ทุก action ในไฟล์นี้ใช้ได้เฉพาะผู้ดูแลระบบ

export type UserFormState = { error?: string; ok?: string } | null;

const role = (v: FormDataEntryValue | null): UserRole =>
  (userRoles as readonly string[]).includes(String(v)) ? (v as UserRole) : "staff";

export async function createUser(_prev: UserFormState, formData: FormData): Promise<UserFormState> {
  await requireAdmin();
  const username = String(formData.get("username") ?? "").trim().toLowerCase();
  const name = String(formData.get("name") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!/^[a-z0-9._-]{3,32}$/.test(username)) return { error: "ชื่อผู้ใช้ต้องเป็น a-z, 0-9, . _ - ยาว 3–32 ตัว" };
  if (!name) return { error: "กรุณาใส่ชื่อที่แสดง" };
  if (password.length < 8) return { error: "รหัสผ่านต้องยาวอย่างน้อย 8 ตัวอักษร" };
  if (await db.query.users.findFirst({ where: eq(users.username, username) })) {
    return { error: "ชื่อผู้ใช้นี้มีอยู่แล้ว" };
  }
  await db.insert(users).values({ username, name, role: role(formData.get("role")), passwordHash: await hashPassword(password) });
  revalidatePath("/admin/users");
  return { ok: `เพิ่มพนักงาน ${name} แล้ว` };
}

export async function changePassword(_prev: UserFormState, formData: FormData): Promise<UserFormState> {
  await requireAdmin();
  const id = Number(formData.get("id"));
  const password = String(formData.get("password") ?? "");
  if (password.length < 8) return { error: "รหัสผ่านต้องยาวอย่างน้อย 8 ตัวอักษร" };
  await db.update(users).set({ passwordHash: await hashPassword(password) }).where(eq(users.id, id));
  return { ok: "เปลี่ยนรหัสผ่านแล้ว" };
}

export async function setUserActive(formData: FormData) {
  const me = await requireAdmin();
  const id = Number(formData.get("id"));
  if (id === me.id) return; // ปิดบัญชีตัวเองไม่ได้
  await db.update(users).set({ active: formData.get("active") === "1" }).where(eq(users.id, id));
  revalidatePath("/admin/users");
}

export async function setUserRole(formData: FormData) {
  const me = await requireAdmin();
  const id = Number(formData.get("id"));
  if (id === me.id) return; // ลดสิทธิ์ตัวเองไม่ได้ กันไม่มีแอดมินเหลือ
  await db.update(users).set({ role: role(formData.get("role")) }).where(eq(users.id, id));
  revalidatePath("/admin/users");
}

// ลบบัญชีพนักงานที่ออกไปแล้ว (ลบตัวเองไม่ได้) — คุกกี้ของบัญชีที่ถูกลบใช้ต่อไม่ได้ เพราะหาผู้ใช้ไม่เจอ
export async function deleteUser(formData: FormData) {
  const me = await requireAdmin();
  const id = Number(formData.get("id"));
  if (!id || id === me.id) return;
  await db.delete(users).where(eq(users.id, id));
  revalidatePath("/admin/users");
}
