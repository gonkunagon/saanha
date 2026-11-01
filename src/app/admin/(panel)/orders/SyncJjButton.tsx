"use client";

import { useActionState } from "react";
import { syncFromJj, type JjSyncState } from "./jj-actions";

export function SyncJjButton() {
  const [state, action, pending] = useActionState<JjSyncState>(syncFromJj, null);
  const r = state?.ok ? state.result : null;

  return (
    <form action={action} className="flex flex-col items-end gap-1">
      <button disabled={pending} className="btn-secondary py-2 text-sm">
        {pending ? "กำลังซิงค์…" : "↻ ซิงค์จาก JJ Cargo"}
      </button>
      {state && !state.ok && <p className="text-sm text-brand-700">{state.error}</p>}
      {r && (
        <p className="text-right text-xs text-emerald-700">
          ซิงค์แล้ว · ออเดอร์ใหม่ {r.ordersCreated} · รายการใหม่ {r.itemsCreated} · พัสดุใหม่ {r.packagesCreated} · อัปเดต{" "}
          {r.packagesUpdated} · ตู้ใหม่ {r.containersCreated}
        </p>
      )}
    </form>
  );
}
