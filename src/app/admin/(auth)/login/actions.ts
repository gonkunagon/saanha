"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { users } from "@/db/schema";
import { startSession } from "@/lib/auth";
import { verifyPassword } from "@/lib/password";

export async function login(_prev: string | null, formData: FormData): Promise<string | null> {
  const username = String(formData.get("username") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const user = username ? await db.query.users.findFirst({ where: eq(users.username, username) }) : null;

  if (!user || !user.active || !(await verifyPassword(password, user.passwordHash))) {
    await new Promise((r) => setTimeout(r, 800)); // หน่วงเวลา ลดการสุ่มเดารหัสผ่าน
    return "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง";
  }
  await startSession(user.id);
  redirect("/admin");
}
