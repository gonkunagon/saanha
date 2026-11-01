"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { findParcelsByTracking, JjCargoError, type JjParcel } from "@/lib/jjcargo";
import { runJjSync, type SyncResult } from "@/lib/jjsync";

export type JjSyncState = { ok: true; result: SyncResult; at: string } | { ok: false; error: string } | null;

// ปุ่ม "ซิงค์จาก JJ Cargo" ในหน้าออเดอร์: นำเข้าพัสดุใหม่ทั้งหมด และอัปเดตของเดิม
export async function syncFromJj(): Promise<JjSyncState> {
  await requireUser();
  try {
    const result = await runJjSync();
    revalidatePath("/admin", "layout");
    return { ok: true, result, at: new Date().toISOString() };
  } catch (err) {
    if (err instanceof JjCargoError) return { ok: false, error: err.message };
    console.error("[jj-sync]", err);
    return { ok: false, error: "ซิงค์ไม่สำเร็จ กรุณาลองใหม่" };
  }
}

export type JjLookupResult = { ok: true; parcels: JjParcel[] } | { ok: false; error: string };

// ดึงข้อมูลพัสดุจาก JJ Cargo ด้วยเลขพัสดุจีน (ปุ่ม "ดึง" ในแถวพัสดุ)
export async function lookupJjParcels(trackingNo: string): Promise<JjLookupResult> {
  await requireUser();
  const tracking = trackingNo.trim();
  if (tracking.length < 3) return { ok: false, error: "กรุณาใส่เลขพัสดุจีนก่อนกดดึงข้อมูล" };
  try {
    const parcels = await findParcelsByTracking(tracking);
    if (parcels.length === 0) {
      const only = process.env.JJ_CARGO_CUSTOMER_CODES?.trim();
      return {
        ok: false,
        error: `ไม่พบเลขพัสดุ ${tracking} ในระบบ JJ Cargo` + (only ? ` (ค้นเฉพาะลูกค้า ${only})` : ""),
      };
    }
    return { ok: true, parcels };
  } catch (err) {
    if (err instanceof JjCargoError) return { ok: false, error: err.message };
    console.error("[jj-cargo]", err);
    return { ok: false, error: "เชื่อมต่อ JJ Cargo ไม่ได้ กรุณาลองใหม่" };
  }
}
