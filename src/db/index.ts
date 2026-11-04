import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema";

// ฐานข้อมูล Postgres บน Supabase — DATABASE_URL = connection string แบบ pooler (Session หรือ Transaction)
const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set (Supabase Postgres connection string in .env.local)");

const globalForDb = globalThis as unknown as { pg?: ReturnType<typeof postgres> };

// ใช้ pooler โหมด Transaction (พอร์ต 6543) — แชร์การเชื่อมต่อได้ ไม่ติดเพดาน 15 clients ของโหมด Session
// prepare: false จำเป็นสำหรับโหมดนี้ · บน Vercel แต่ละ instance ใช้ไม่เกิน 3 การเชื่อมต่อ และปิดเองเมื่อว่าง 20 วินาที
const client =
  globalForDb.pg ?? postgres(url, { prepare: false, max: process.env.VERCEL ? 3 : 5, idle_timeout: 20 });

if (process.env.NODE_ENV !== "production") globalForDb.pg = client;

export const db = drizzle(client, { schema });
