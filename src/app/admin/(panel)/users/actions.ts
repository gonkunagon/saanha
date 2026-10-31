"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { users } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { hashPassword } from "@/lib/password";

export type UserFormState = { error?: string; ok?: string } | null;

export async function createUser(_prev: UserFormState, formData: FormData): Promise<UserFormState> {
  await requireUser();
  const username = String(formData.get("username") ?? "").trim().toLowerCase();
  const name = String(formData.get("name") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!/^[a-z0-9._-]{3,32}$/.test(username)) return { error: "ชื่อผู้ใช้ต้องเป็น a-z, 0-9, . _ - ยาว 3–32 ตัว" };
  if (!name) return { error: "กรุณาใส่ชื่อที่แสดง" };
  if (password.length < 8) return { error: "รหัสผ่านต้องยาวอย่างน้อย 8 ตัวอักษร" };
  if (await db.query.users.findFirst({ where: eq(users.username, username) })) {
    return { error: "ชื่อผู้ใช้นี้มีอยู่แล้ว" };
  }
  await db.insert(users).values({ username, name, passwordHash: await hashPassword(password) });
  revalidatePath("/admin/users");
  return { ok: `เพิ่มพนักงาน ${name} แล้ว` };
}

export async function changePassword(_prev: UserFormState, formData: FormData): Promise<UserFormState> {
  await requireUser();
  const id = Number(formData.get("id"));
  const password = String(formData.get("password") ?? "");
  if (password.length < 8) return { error: "รหัสผ่านต้องยาวอย่างน้อย 8 ตัวอักษร" };
  await db.update(users).set({ passwordHash: await hashPassword(password) }).where(eq(users.id, id));
  return { ok: "เปลี่ยนรหัสผ่านแล้ว" };
}

export async function setUserActive(formData: FormData) {
  const me = await requireUser();
  const id = Number(formData.get("id"));
  if (id === me.id) return; // ปิดบัญชีตัวเองไม่ได้
  await db.update(users).set({ active: formData.get("active") === "1" }).where(eq(users.id, id));
  revalidatePath("/admin/users");
}
