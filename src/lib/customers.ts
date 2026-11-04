import { asc, eq, like, sql } from "drizzle-orm";
import { db } from "@/db";
import { customers } from "@/db/schema";
import { phoneDigits } from "./phone";

const digitsSql = sql`replace(replace(replace(replace(${customers.phone}, '-', ''), ' ', ''), '(', ''), ')', '')`;

export async function findCustomerByPhone(phone: string) {
  const digits = phoneDigits(phone);
  if (!digits) return undefined;
  return db.query.customers.findFirst({ where: sql`${digitsSql} = ${digits}` });
}

export const findCustomerById = (id: number) =>
  db.query.customers.findFirst({ where: sql`${customers.id} = ${id}` });

// รหัสลูกค้าถัดไป: C + เลข 4 หลัก ต่อจากรหัสรูปแบบ C#### ที่มากที่สุด (รหัสที่พนักงานตั้งเองรูปแบบอื่นไม่นับ)
export async function nextCustomerCode() {
  const rows = await db.select({ code: customers.code }).from(customers).where(like(customers.code, "C%"));
  const max = Math.max(0, ...rows.map((r) => (/^C(\d+)$/.exec(r.code ?? "")?.[1] ?? "0")).map(Number));
  return `C${String(max + 1).padStart(4, "0")}`;
}

// รายชื่อลูกค้าสำหรับช่องเลือกในฟอร์มออเดอร์
export const listCustomersForPicker = () =>
  db
    .select({ id: customers.id, code: customers.code, name: customers.name, phone: customers.phone, lineId: customers.lineId })
    .from(customers)
    .orderBy(asc(customers.name));

export type PickerCustomer = Awaited<ReturnType<typeof listCustomersForPicker>>[number];
