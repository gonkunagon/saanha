import { NextResponse } from "next/server";

type QuoteRequest = {
  name: string;
  phone: string;
  lineId?: string;
  product: string;
  quantity?: string;
  productType?: string;
  method?: string;
  message?: string;
};

const methodLabels: Record<string, string> = { truck: "ทางรถ", sea: "ทางเรือ", unsure: "ยังไม่แน่ใจ" };
const typeLabels: Record<string, string> = {
  general: "สินค้าทั่วไป",
  regulated: "สินค้ามี อย. / มอก.",
  brand: "สินค้าแบรนด์",
  unsure: "ยังไม่แน่ใจ",
};

// ตัดข้อความยาวเกิน กันข้อความ LINE เกินขีดจำกัด 5,000 ตัวอักษร
const clip = (s: unknown, max = 1000) => String(s ?? "").trim().slice(0, max);

function buildMessage(q: QuoteRequest) {
  return [
    "📦 คำขอใบเสนอราคาใหม่",
    `ชื่อ: ${clip(q.name, 100)}`,
    `โทร: ${clip(q.phone, 30)}`,
    `LINE ID: ${clip(q.lineId, 50) || "-"}`,
    `ประเภทสินค้า: ${typeLabels[q.productType ?? ""] ?? "-"}`,
    `ขนส่ง: ${methodLabels[q.method ?? ""] ?? "-"}`,
    `จำนวน: ${clip(q.quantity, 100) || "-"}`,
    `สินค้า:\n${clip(q.product, 2000)}`,
    `หมายเหตุ: ${clip(q.message) || "-"}`,
  ].join("\n");
}

// ส่งข้อความเข้า LINE ของทีมงานผ่าน LINE Messaging API (push message)
async function pushToLine(text: string) {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  const to = process.env.LINE_TARGET_ID;
  if (!token || !to) {
    console.warn("[quote] LINE not configured, request only logged:\n" + text);
    return true;
  }
  const res = await fetch("https://api.line.me/v2/bot/message/push", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ to, messages: [{ type: "text", text }] }),
  });
  if (!res.ok) console.error("[quote] LINE push failed", res.status, await res.text());
  return res.ok;
}

export async function POST(request: Request) {
  let body: Partial<QuoteRequest>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  if (!body.name?.trim() || !body.phone?.trim() || !body.product?.trim()) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }

  const sent = await pushToLine(buildMessage(body as QuoteRequest));
  if (!sent) return NextResponse.json({ error: "notify_failed" }, { status: 502 });

  return NextResponse.json({ ok: true });
}
