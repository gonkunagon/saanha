import { NextResponse } from "next/server";
import postgres from "postgres";
import { getCurrentUser } from "@/lib/auth";
import { databaseUrl } from "@/db";

// ชั่วคราว: ตรวจว่า Vercel ใช้พอร์ต/เวอร์ชันไหน และต่อฐานข้อมูลได้ไหม (เฉพาะพนักงานที่ล็อกอิน) — ลบหลังแก้ปัญหาเสร็จ
export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await getCurrentUser())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const url = databaseUrl;
  const m = url.match(/@([^:/]+):(\d+)\//);
  const envPort = (process.env.DATABASE_URL ?? "").match(/:(\d+)\/postgres/)?.[1];
  let db: string;
  const sql = postgres(url, { prepare: false, max: 1, connect_timeout: 10 });
  try {
    const [r] = await sql`select 1 as ok`;
    db = `ok ${r.ok}`;
  } catch (e) {
    db = `ERROR ${(e as { code?: string }).code ?? ""} ${(e as Error).message}`;
  } finally {
    await sql.end({ timeout: 2 });
  }
  return NextResponse.json({
    host: m?.[1],
    port: m?.[2],
    envPort,
    commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? null,
    region: process.env.VERCEL_REGION ?? null,
    env: process.env.VERCEL_ENV ?? null,
    db,
  });
}
