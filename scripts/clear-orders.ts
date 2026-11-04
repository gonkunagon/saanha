// ล้างออเดอร์ รายการสินค้า และตู้ทั้งหมด (เก็บบัญชีพนักงานและลูกค้าไว้) — ลบข้อมูลจริงบน Supabase ทิ้งหมด ใช้ตอนทดสอบเท่านั้น
// ใช้: npm run db:clear-orders -- --yes

import postgres from "postgres";

async function main() {
  process.loadEnvFile?.(".env.local");
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  if (!process.argv.includes("--yes")) {
    console.error("This deletes every order, item and container. Re-run with --yes to confirm.");
    process.exit(1);
  }

  const sql = postgres(url, { prepare: false, max: 1 });
  const tables = ["item_packages", "item_images", "order_items", "payments", "orders", "containers", "ignored_imports"];
  const count = async () =>
    Object.fromEntries(
      await Promise.all(tables.map(async (t) => [t, Number((await sql.unsafe(`select count(*) as n from ${t}`))[0].n)])),
    );

  console.log("before", await count());
  // ล้างรายการ "ลบแล้วไม่ต้องดึงกลับ" ด้วย เริ่มใหม่แล้วซิงค์จะดึงทุกพัสดุอีกครั้ง
  await sql.begin(async (tx) => {
    for (const t of tables) await tx.unsafe(`delete from ${t}`);
  });
  console.log("after ", await count());
  await sql.end();
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
