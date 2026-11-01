"use client";

import { useActionState } from "react";
import type { SyncResult, SyncStatus } from "@/lib/jjsync";
import { syncFromJj, type JjSyncState } from "./jj-actions";

const time = (iso: string) =>
  new Date(iso).toLocaleTimeString("th-TH", { timeZone: "Asia/Bangkok", hour: "2-digit", minute: "2-digit" });

const summary = (r: SyncResult) =>
  `ออเดอร์ใหม่ ${r.ordersCreated} · รายการใหม่ ${r.itemsCreated} · พัสดุใหม่ ${r.packagesCreated} · อัปเดต ${r.packagesUpdated} · ตู้ใหม่ ${r.containersCreated}`;

// status = สถานะการซิงค์ล่าสุดจากเซิร์ฟเวอร์ (รวมการซิงค์อัตโนมัติ)
export function SyncJjButton({ status }: { status: SyncStatus }) {
  const [state, action, pending] = useActionState<JjSyncState>(syncFromJj, null);

  return (
    <form action={action} className="flex flex-col items-end gap-1">
      <button disabled={pending} className="btn-secondary py-2 text-sm">
        {pending ? "กำลังซิงค์…" : "↻ ซิงค์จาก JJ Cargo"}
      </button>
      {state && !state.ok && <p className="text-sm text-brand-700">{state.error}</p>}
      {state?.ok && <p className="text-right text-xs text-emerald-700">ซิงค์แล้ว · {summary(state.result)}</p>}
      {!state && (
        <p className="text-right text-xs text-gray-500">
          {status.autoEveryMinutes ? `ซิงค์อัตโนมัติทุก ${status.autoEveryMinutes} นาที` : "ยังไม่ได้เปิดซิงค์อัตโนมัติ"}
          {status.running && " · กำลังซิงค์…"}
          {status.lastAt && ` · ล่าสุด ${time(status.lastAt)} น.`}
          {status.lastError ? (
            <span className="block text-brand-700">รอบล่าสุดไม่สำเร็จ: {status.lastError}</span>
          ) : (
            status.lastResult && <span className="block">{summary(status.lastResult)}</span>
          )}
        </p>
      )}
    </form>
  );
}
