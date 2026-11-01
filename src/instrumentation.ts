// ทำงานครั้งเดียวตอนเซิร์ฟเวอร์เริ่ม: ตั้งเวลาซิงค์ JJ Cargo อัตโนมัติ
// ทุก JJ_CARGO_SYNC_MINUTES นาที (ค่าเริ่มต้น 15, ใส่ 0 = ปิด) เมื่อตั้งค่า JJ Cargo แล้ว
// ใช้ได้กับเซิร์ฟเวอร์ที่รันตลอด (npm run dev / npm start) — ถ้า deploy แบบ serverless ให้ใช้ /api/cron/jj-sync แทน

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (!process.env.JJ_CARGO_URL || !process.env.JJ_CARGO_USERNAME || !process.env.JJ_CARGO_PASSWORD) return;

  const minutes = Number(process.env.JJ_CARGO_SYNC_MINUTES ?? 15);
  if (!Number.isFinite(minutes) || minutes <= 0) return;

  // กันตั้งเวลาซ้ำตอน dev server โหลดโค้ดใหม่
  const g = globalThis as unknown as { jjAutoSyncTimer?: ReturnType<typeof setInterval> };
  if (g.jjAutoSyncTimer) clearInterval(g.jjAutoSyncTimer);

  const { runJjSync, setAutoSyncMinutes } = await import("./lib/jjsync");
  setAutoSyncMinutes(minutes);

  const tick = async () => {
    try {
      const r = await runJjSync();
      console.log(
        `[jj-auto-sync] ok · orders +${r.ordersCreated} · items +${r.itemsCreated} · packages +${r.packagesCreated} · updated ${r.packagesUpdated} · containers +${r.containersCreated}`,
      );
    } catch (err) {
      console.error("[jj-auto-sync] failed:", err instanceof Error ? err.message : err);
    }
  };

  setTimeout(tick, 10_000); // ซิงค์รอบแรกหลังเซิร์ฟเวอร์เริ่ม 10 วินาที
  g.jjAutoSyncTimer = setInterval(tick, minutes * 60_000);
  console.log(`[jj-auto-sync] scheduled every ${minutes} min`);
}
