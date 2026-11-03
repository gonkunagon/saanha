"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { setCnyRate } from "@/lib/settings";

// บันทึกเรทหยวนของวันนี้ (ใช้กับทุกใบเสนอราคาที่เป็นเงินหยวน)
export async function saveCnyRate(fd: FormData) {
  await requireUser();
  const rate = parseFloat(String(fd.get("rate") ?? ""));
  if (!Number.isFinite(rate) || rate <= 0 || rate > 100) return;
  await setCnyRate(Math.round(rate * 10000) / 10000);
  revalidatePath("/admin/quote", "layout");
}
