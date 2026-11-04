"use server";

import sharp from "sharp";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { itemImages } from "@/db/schema";
import { requireUser } from "@/lib/auth";

// รูปสินค้า: ย่อเป็น JPEG ด้านยาวไม่เกิน 1200px (รูปจากมือถือหลาย MB เหลือราว 100–300KB) แล้วเก็บในฐานข้อมูล
const MAX_PER_ITEM = 6;
const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;

export async function uploadItemImages(fd: FormData) {
  await requireUser();
  const itemId = Number(fd.get("itemId"));
  if (!itemId) return;
  const existing = await db.$count(itemImages, eq(itemImages.itemId, itemId));
  const files = fd
    .getAll("images")
    .filter((f): f is File => f instanceof File && f.size > 0 && f.size <= MAX_UPLOAD_BYTES && f.type.startsWith("image/"))
    .slice(0, Math.max(0, MAX_PER_ITEM - existing));
  for (const file of files) {
    try {
      const data = await sharp(Buffer.from(await file.arrayBuffer()))
        .rotate() // หมุนตาม EXIF ของรูปจากมือถือ
        .resize({ width: 1200, height: 1200, fit: "inside", withoutEnlargement: true })
        .jpeg({ quality: 80 })
        .toBuffer();
      await db.insert(itemImages).values({ itemId, mime: "image/jpeg", data });
    } catch {
      // ไฟล์ที่ไม่ใช่รูปจริง / อ่านไม่ได้ ข้ามไป
    }
  }
  revalidatePath("/admin", "layout");
}

export async function deleteItemImage(fd: FormData) {
  await requireUser();
  await db.delete(itemImages).where(eq(itemImages.id, Number(fd.get("imageId"))));
  revalidatePath("/admin", "layout");
}
