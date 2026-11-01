import { NextResponse } from "next/server";
import { JjCargoError } from "@/lib/jjcargo";
import { runJjSync } from "@/lib/jjsync";

// ซิงค์จาก JJ Cargo ตามเวลา (เช่น Vercel Cron) — ต้องส่ง Authorization: Bearer <CRON_SECRET>
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 503 });
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    return NextResponse.json({ ok: true, result: await runJjSync() });
  } catch (err) {
    const message = err instanceof JjCargoError ? err.message : "sync failed";
    if (!(err instanceof JjCargoError)) console.error("[jj-sync cron]", err);
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
