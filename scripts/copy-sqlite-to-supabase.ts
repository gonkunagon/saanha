// ย้ายข้อมูลครั้งเดียว: local.db (SQLite เดิม) → Supabase Postgres (DATABASE_URL ใน .env.local)
// ต้องสร้างตารางก่อนด้วย npm run db:migrate — สคริปต์จะไม่ทำงานถ้าตารางปลายทางมีข้อมูลอยู่แล้ว (กันข้อมูลซ้ำ)
// ใช้: npm run db:copy-from-sqlite

import { createClient } from "@libsql/client";
import postgres from "postgres";

// เรียงตาม foreign key: ตารางแม่ก่อนตารางลูก
const tables = ["users", "customers", "containers", "orders", "order_items", "item_packages", "item_images", "app_settings", "ignored_imports"];
const booleans = new Set(["active", "hide_shop_on_quote"]);

// SQLite เก็บวันที่เป็นวินาที (integer), boolean เป็น 0/1, รูปเป็น blob
function convert(col: string, v: unknown) {
  if (v == null) return null;
  if (col.endsWith("_at")) return new Date(Number(v) * 1000);
  if (booleans.has(col)) return Number(v) === 1;
  if (v instanceof ArrayBuffer) return Buffer.from(v);
  return v;
}

async function main() {
  process.loadEnvFile?.(".env.local");
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");

  const src = createClient({ url: "file:local.db" });
  const sql = postgres(url, { prepare: false, max: 1 });

  for (const t of tables) {
    const [{ n }] = await sql.unsafe(`select count(*)::int as n from ${t}`);
    if (n > 0) throw new Error(`Table ${t} on Supabase already has ${n} rows - stopping so nothing is copied twice.`);
  }

  await sql.begin(async (tx) => {
    for (const t of tables) {
      const { rows, columns } = await src.execute(`select * from ${t}`);
      for (const r of rows) {
        const row = Object.fromEntries(columns.map((c) => [c, convert(c, r[c])]));
        await tx`insert into ${tx(t)} ${tx(row as Record<string, postgres.ParameterOrJSON<never>>)}`;
      }
      // ให้ id ถัดไปต่อจาก id เดิม (เพราะคัดลอก id มาเอง)
      if (columns.includes("id")) {
        await tx.unsafe(`select setval(pg_get_serial_sequence('${t}', 'id'), coalesce(max(id), 1), max(id) is not null) from ${t}`);
      }
      console.log(`${t}: ${rows.length}`);
    }
  });

  await sql.end();
  src.close();
  console.log("Done.");
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
