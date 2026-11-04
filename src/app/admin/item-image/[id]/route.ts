import { eq } from "drizzle-orm";
import { db } from "@/db";
import { itemImages } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";

// ส่งรูปสินค้าจากฐานข้อมูล — เฉพาะพนักงานที่ล็อกอินแล้ว (รูปอยู่หลังบ้าน ไม่เปิดสาธารณะ)
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getCurrentUser())) return new Response("Unauthorized", { status: 401 });
  const { id } = await params;
  const row = await db.query.itemImages.findFirst({ where: eq(itemImages.id, Number(id)) });
  if (!row) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(row.data), {
    headers: { "Content-Type": row.mime, "Cache-Control": "private, max-age=86400" },
  });
}
