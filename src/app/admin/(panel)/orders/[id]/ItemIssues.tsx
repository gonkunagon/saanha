"use client";

import { startTransition, useActionState, useState, useTransition } from "react";
import { deleteIssue, saveIssue } from "../issue-actions";
import {
  issueFoundAtLabels,
  issueKindLabels,
  issueNetLoss,
  issueResponsibleLabels,
  issueStatusClass,
  issueStatusLabels,
  type IssueKind,
  type IssueStatus,
} from "@/lib/issues";

type Item = { id: number; description: string; boxes: number | null };
export type IssueRow = {
  id: number;
  itemId: number;
  kind: IssueKind;
  boxes: number | null;
  foundAt: keyof typeof issueFoundAtLabels | null;
  responsible: keyof typeof issueResponsibleLabels;
  compensation: number | null;
  recovered: number | null;
  status: IssueStatus;
  note: string | null;
};

const baht = (n: number) => `${n.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท`;
const kindClass: Record<IssueKind, string> = {
  damaged: "bg-amber-100 text-amber-800",
  lost: "bg-brand-100 text-brand-800",
  wrong: "bg-sky-100 text-sky-800",
};

function IssueForm({ orderId, items, issue, onDone }: { orderId: number; items: Item[]; issue: IssueRow | null; onDone: () => void }) {
  const [error, action, pending] = useActionState(async (prev: string | null, fd: FormData) => {
    const err = await saveIssue(prev, fd);
    if (!err) onDone();
    return err;
  }, null);
  const [kind, setKind] = useState<IssueKind>(issue?.kind ?? "damaged");
  return (
    // ส่งเองผ่าน onSubmit (ไม่ให้ React ล้างฟอร์มเมื่อมี error)
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        startTransition(() => action(fd));
      }}
      className="mt-3 rounded-lg bg-gray-50 p-3 [&_input]:bg-white [&_select]:bg-white [&_textarea]:bg-white"
    >
      <input type="hidden" name="orderId" value={orderId} />
      {issue && <input type="hidden" name="issueId" value={issue.id} />}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="block sm:col-span-2">
          <span className="mb-1 block text-sm text-gray-600">รายการสินค้า *</span>
          <select name="itemId" required defaultValue={issue?.itemId ?? (items.length === 1 ? items[0].id : "")} className="input">
            {items.length > 1 && <option value="">— เลือกรายการ —</option>}
            {items.map((i) => (
              <option key={i.id} value={i.id}>
                {i.description}
                {i.boxes != null ? ` (${i.boxes} กล่อง)` : ""}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-sm text-gray-600">ประเภท *</span>
          <select name="kind" value={kind} onChange={(e) => setKind(e.target.value as IssueKind)} className="input">
            {Object.entries(issueKindLabels).map(([k, l]) => (
              <option key={k} value={k}>{l}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-sm text-gray-600">จำนวนกล่อง{kind === "lost" ? " *" : ""}</span>
          <input name="boxes" type="number" min={0} required={kind === "lost"} defaultValue={issue?.boxes ?? ""} className="input" />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm text-gray-600">พบตอนไหน</span>
          <select name="foundAt" defaultValue={issue?.foundAt ?? ""} className="input">
            <option value="">—</option>
            {Object.entries(issueFoundAtLabels).map(([k, l]) => (
              <option key={k} value={k}>{l}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-sm text-gray-600">ใครรับผิดชอบ</span>
          <select name="responsible" defaultValue={issue?.responsible ?? "unknown"} className="input">
            {Object.entries(issueResponsibleLabels).map(([k, l]) => (
              <option key={k} value={k}>{l}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-sm text-gray-600">ชดเชยให้ลูกค้า (บาท)</span>
          <input name="compensation" type="number" step="0.01" min={0} defaultValue={issue?.compensation ?? ""} className="input" />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm text-gray-600">เคลมคืนได้ (บาท · ลูกค้าไม่เห็น)</span>
          <input name="recovered" type="number" step="0.01" min={0} defaultValue={issue?.recovered ?? ""} className="input" />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm text-gray-600">สถานะเรื่อง</span>
          <select name="status" defaultValue={issue?.status ?? "open"} className="input">
            {Object.entries(issueStatusLabels).map(([k, l]) => (
              <option key={k} value={k}>{l}</option>
            ))}
          </select>
        </label>
        <label className="block sm:col-span-2 lg:col-span-3">
          <span className="mb-1 block text-sm text-gray-600">หมายเหตุ (รายละเอียด / ลิงก์รูป)</span>
          <textarea name="note" rows={2} defaultValue={issue?.note ?? ""} className="input" />
        </label>
      </div>
      <p className="mt-2 text-xs text-gray-500">
        {kind === "lost"
          ? "กล่องที่สูญหาย หักออกจากจำนวนที่ต้องส่ง (รอบส่ง) ให้อัตโนมัติ · "
          : "กล่องที่เสียหาย / ส่งผิด ยังนับว่าส่งให้ลูกค้าตามปกติ · "}
        เงินชดเชยลูกค้า หักในบิลค่าขนส่งของตู้ที่รายการนี้อยู่
      </p>
      {error && <p className="mt-2 text-sm font-medium text-brand-700">{error}</p>}
      <div className="mt-3 flex items-center gap-3">
        <button disabled={pending} className="btn-primary disabled:opacity-50">{pending ? "กำลังบันทึก..." : "บันทึก"}</button>
        <button type="button" onClick={onDone} className="text-sm text-gray-500 hover:underline">ยกเลิก</button>
      </div>
    </form>
  );
}

// แจ้งปัญหาสินค้า (เสียหาย / สูญหาย / ส่งผิด) ของออเดอร์ — แยกจากจำนวนกล่องของรายการ
export function ItemIssues({ orderId, items, issues }: { orderId: number; items: Item[]; issues: IssueRow[] }) {
  const [open, setOpen] = useState<"new" | number | null>(null);
  const [pending, start] = useTransition();
  const desc = (id: number) => items.find((i) => i.id === id)?.description ?? "-";
  const comp = issues.reduce((s, i) => s + (i.compensation ?? 0), 0);
  const rec = issues.reduce((s, i) => s + (i.recovered ?? 0), 0);

  const addButton = (
    <button
      type="button"
      onClick={() => setOpen("new")}
      className="rounded-lg border border-brand-600 px-3 py-1 text-xs font-medium text-brand-600 hover:bg-brand-50"
    >
      ⚠️ แจ้งปัญหาสินค้า
    </button>
  );

  if (issues.length === 0) {
    return open === "new" ? (
      <div className="mt-3 rounded-lg border border-gray-200 p-3">
        <p className="text-sm font-semibold text-gray-800">⚠️ แจ้งปัญหาสินค้า (เสียหาย / สูญหาย / ส่งผิด)</p>
        <IssueForm orderId={orderId} items={items} issue={null} onDone={() => setOpen(null)} />
      </div>
    ) : (
      <div className="mt-3">{addButton}</div>
    );
  }

  return (
    <div className="mt-3 rounded-lg border border-brand-200 p-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-gray-800">⚠️ ปัญหาสินค้า ({issues.length} เรื่อง)</p>
        {open !== "new" && addButton}
      </div>
      {open === "new" && <IssueForm orderId={orderId} items={items} issue={null} onDone={() => setOpen(null)} />}
      <ul className="divide-y divide-gray-100">
        {issues.map((i) => (
          <li key={i.id} className="py-2.5">
            {open === i.id ? (
              <IssueForm orderId={orderId} items={items} issue={i} onDone={() => setOpen(null)} />
            ) : (
              <div className="flex flex-wrap items-start gap-x-3 gap-y-1 text-sm">
                <span className={`rounded px-2 py-0.5 text-xs font-medium ${kindClass[i.kind]}`}>{issueKindLabels[i.kind]}</span>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-gray-900">
                    {desc(i.itemId)}
                    {i.boxes != null && <span className="font-normal text-gray-600"> · {i.boxes} กล่อง</span>}
                  </p>
                  <p className="text-xs text-gray-500">
                    {[
                      i.foundAt && `พบที่ ${issueFoundAtLabels[i.foundAt]}`,
                      `รับผิดชอบ: ${issueResponsibleLabels[i.responsible]}`,
                      i.compensation != null && `ชดเชยลูกค้า ${baht(i.compensation)}`,
                      i.recovered != null && `เคลมคืนได้ ${baht(i.recovered)}`,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                  {i.note && <p className="mt-0.5 text-xs whitespace-pre-line text-gray-600">{i.note}</p>}
                </div>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${issueStatusClass[i.status]}`}>{issueStatusLabels[i.status]}</span>
                <span className="flex gap-2 text-xs">
                  <button type="button" onClick={() => setOpen(i.id)} className="text-brand-600 hover:underline">แก้ไข</button>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => {
                      if (window.confirm(`ลบเรื่อง "${issueKindLabels[i.kind]} · ${desc(i.itemId)}"?`)) start(() => deleteIssue(orderId, i.id));
                    }}
                    className="text-gray-400 hover:text-brand-600 hover:underline"
                  >
                    ลบ
                  </button>
                </span>
              </div>
            )}
          </li>
        ))}
      </ul>
      {(comp > 0 || rec > 0) && (
        <p className="mt-2 border-t border-gray-100 pt-2 text-xs text-gray-600">
          ชดเชยลูกค้ารวม <b>{baht(comp)}</b> · เคลมคืนได้รวม <b>{baht(rec)}</b> · ร้านเสียจริง{" "}
          <b className={issueNetLoss({ compensation: comp, recovered: rec }) > 0 ? "text-brand-700" : "text-emerald-700"}>
            {baht(issueNetLoss({ compensation: comp, recovered: rec }))}
          </b>
        </p>
      )}
    </div>
  );
}
