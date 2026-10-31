import { NextResponse } from "next/server";
import { getTrackingView } from "@/lib/orders";

// จำกัดจำนวนครั้งที่ค้นหาต่อ IP กันการสุ่มเดาเบอร์ 4 ตัวท้าย
// (เก็บในหน่วยความจำ ใช้ได้ระดับพื้นฐาน ถ้ามีหลายเซิร์ฟเวอร์ควรย้ายไปใช้ Redis)
const WINDOW_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 20;
const attempts = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(ip: string) {
  const now = Date.now();
  const entry = attempts.get(ip);
  if (!entry || entry.resetAt < now) {
    attempts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  entry.count++;
  return entry.count > MAX_ATTEMPTS;
}

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "local";
  if (isRateLimited(ip)) {
    return NextResponse.json({ error: "too_many_requests" }, { status: 429 });
  }

  let body: { trackingNo?: unknown; phoneLast4?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const trackingNo = String(body.trackingNo ?? "").trim();
  const phoneLast4 = String(body.phoneLast4 ?? "").trim();
  if (trackingNo.length < 3 || trackingNo.length > 40 || !/^\d{4}$/.test(phoneLast4)) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  try {
    const order = await getTrackingView(trackingNo, phoneLast4);
    if (!order) return NextResponse.json({ error: "not_found" }, { status: 404 });
    return NextResponse.json({ order });
  } catch (err) {
    console.error("[track]", err);
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }
}
