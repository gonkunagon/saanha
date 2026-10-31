// ล้างออเดอร์ รายการสินค้า และตู้ทั้งหมด (เก็บบัญชีพนักงานไว้) — ใช้กับฐานข้อมูลทดสอบในเครื่องเท่านั้น
// ใช้: npm run db:clear-orders

import { createClient } from "@libsql/client";

async function main() {
  const url = process.env.DATABASE_URL ?? "file:local.db";
  if (!url.startsWith("file:")) {
    console.error(`Refusing to clear a non-local database: ${url}`);
    process.exit(1);
  }

  const db = createClient({ url });
  const tables = ["item_packages", "order_items", "orders", "containers", "users"];
  const count = async () =>
    Object.fromEntries(
      await Promise.all(tables.map(async (t) => [t, Number((await db.execute(`select count(*) as n from ${t}`)).rows[0].n)])),
    );

  console.log("before", await count());
  await db.batch(
    ["delete from item_packages", "delete from order_items", "delete from orders", "delete from containers"],
    "write",
  );
  console.log("after ", await count());
  db.close();
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
