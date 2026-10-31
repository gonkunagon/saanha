import { NextResponse } from "next/server";

type QuoteRequest = {
  name: string;
  phone: string;
  lineId?: string;
  product: string;
  quantity?: string;
  method?: string;
  message?: string;
};

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

  // TODO: ส่งคำขอไปยังทีมงาน เช่น LINE Messaging API, อีเมล หรือบันทึกลงฐานข้อมูล / Google Sheets
  console.log("[quote] new request", body);

  return NextResponse.json({ ok: true });
}
