import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema";

// ฐานข้อมูล Postgres บน Supabase — DATABASE_URL = connection string แบบ pooler (Session หรือ Transaction)
const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set (Supabase Postgres connection string in .env.local)");

const globalForDb = globalThis as unknown as { pg?: ReturnType<typeof postgres> };

// prepare: false ให้ใช้กับ pooler โหมด Transaction (พอร์ต 6543) ได้ด้วย
const client = globalForDb.pg ?? postgres(url, { prepare: false, max: 5 });

if (process.env.NODE_ENV !== "production") globalForDb.pg = client;

export const db = drizzle(client, { schema });
