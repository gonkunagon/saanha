// สร้างบัญชีพนักงานคนแรก (คนต่อไปเพิ่มได้จากหน้า /admin/users)
// ใช้: npm run user:create -- <username> "<ชื่อที่แสดง>"
// ระบบจะสุ่มรหัสผ่านให้และแสดงครั้งเดียว — เข้าสู่ระบบแล้วเปลี่ยนได้ที่หน้าพนักงาน

import { randomBytes } from "node:crypto";
import { db } from "../src/db";
import { users } from "../src/db/schema";
import { hashPassword } from "../src/lib/password";

async function main() {
  const [username, name] = process.argv.slice(2);
  if (!username || !name) {
    console.error('Usage: npm run user:create -- <username> "<display name>"');
    process.exit(1);
  }
  const password = randomBytes(9).toString("base64url");
  await db.insert(users).values({ username: username.toLowerCase(), name, passwordHash: await hashPassword(password) });
  console.log(`Created user "${username}". Password (shown once): ${password}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
