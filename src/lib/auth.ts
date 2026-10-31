import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users, type User } from "@/db/schema";

const COOKIE = "sanha_admin";
const SESSION_DAYS = 7;

// ---- session cookie (ลงลายเซ็น HMAC) ----

function secret() {
  const s = process.env.AUTH_SECRET;
  if (s && s.length >= 32) return s;
  if (process.env.NODE_ENV === "production") throw new Error("AUTH_SECRET must be set (32+ chars)");
  return "dev-only-secret-do-not-use-in-production";
}

const sign = (payload: string) => createHmac("sha256", secret()).update(payload).digest("base64url");

function encodeSession(userId: number) {
  const payload = Buffer.from(
    JSON.stringify({ uid: userId, exp: Date.now() + SESSION_DAYS * 86400_000 }),
  ).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

function decodeSession(value: string | undefined): number | null {
  if (!value) return null;
  const [payload, sig] = value.split(".");
  if (!payload || !sig) return null;
  const expected = Buffer.from(sign(payload));
  const actual = Buffer.from(sig);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;
  try {
    const { uid, exp } = JSON.parse(Buffer.from(payload, "base64url").toString());
    return typeof uid === "number" && exp > Date.now() ? uid : null;
  } catch {
    return null;
  }
}

export async function startSession(userId: number) {
  const store = await cookies();
  store.set(COOKIE, encodeSession(userId), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 86400,
  });
}

export async function endSession() {
  (await cookies()).delete(COOKIE);
}

export async function getCurrentUser(): Promise<User | null> {
  const uid = decodeSession((await cookies()).get(COOKIE)?.value);
  if (!uid) return null;
  const user = await db.query.users.findFirst({ where: eq(users.id, uid) });
  return user?.active ? user : null;
}

// เรียกในทุกหน้าและทุก server action ของหลังบ้าน
export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");
  return user;
}

// เฉพาะผู้ดูแลระบบ (จัดการบัญชีพนักงาน) — พนักงานทั่วไปจะถูกส่งกลับหน้าภาพรวม
export async function requireAdmin(): Promise<User> {
  const user = await requireUser();
  if (user.role !== "admin") redirect("/admin");
  return user;
}
