"use client";

import { useState, useTransition } from "react";
import type { PickerCustomer } from "@/lib/customers";
import { quickCreateCustomer } from "@/app/admin/(panel)/customers/actions";
import { phoneDigits } from "@/lib/phone";

type Legacy = { name: string; phone: string };

// เลือกลูกค้าจากทะเบียน (พิมพ์ค้นหาชื่อ / เบอร์ / LINE) — ชื่อ เบอร์ LINE ของออเดอร์มาจากลูกค้าที่เลือก
// ยังไม่มีในทะเบียน กด "+ เพิ่มลูกค้าใหม่" เพิ่มได้ในหน้านี้เลย
// legacy = ออเดอร์เก่าที่ยังไม่ผูกลูกค้า (เช่น นำเข้าจาก JJ) แสดงชื่อเดิมไว้ ไม่เลือกก็บันทึกได้
export function CustomerPicker({
  customers: initialCustomers,
  selectedId,
  legacy,
}: {
  customers: PickerCustomer[];
  selectedId?: number | null;
  legacy?: Legacy;
}) {
  const [customers, setCustomers] = useState(initialCustomers);
  const [selected, setSelected] = useState(() => initialCustomers.find((c) => c.id === selectedId) ?? null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);

  const q = query.trim().toLowerCase();
  const digits = phoneDigits(query);
  const matches = customers
    .filter(
      (c) =>
        !q ||
        (c.code ?? "").toLowerCase().includes(q) ||
        c.name.toLowerCase().includes(q) ||
        (c.lineId ?? "").toLowerCase().includes(q) ||
        (digits.length > 0 && phoneDigits(c.phone).includes(digits)),
    )
    .slice(0, 8);

  const choose = (c: PickerCustomer) => {
    setSelected(c);
    setQuery("");
    setOpen(false);
    setAdding(false);
  };

  return (
    <div className="sm:col-span-2">
      <span className="mb-1 block text-sm text-gray-600">ลูกค้า *</span>
      <input type="hidden" name="customerId" value={selected?.id ?? ""} />

      {selected ? (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border border-brand-200 bg-brand-50/50 px-3 py-2">
          {selected.code && <span className="font-mono text-sm text-gray-500">{selected.code}</span>}
          <span className="font-semibold">{selected.name}</span>
          <span className="text-sm text-gray-600">📞 {selected.phone}</span>
          {selected.lineId && <span className="text-sm text-gray-600">LINE: {selected.lineId}</span>}
          <button type="button" onClick={() => setSelected(null)} className="ml-auto text-sm text-brand-600 hover:underline">
            เปลี่ยนลูกค้า
          </button>
        </div>
      ) : (
        <>
          {legacy && (
            <p className="mb-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
              ออเดอร์นี้ยังไม่ผูกกับทะเบียนลูกค้า (ชื่อเดิม: {legacy.name}
              {legacy.phone ? ` · ${legacy.phone}` : ""}) — เลือกลูกค้าเพื่อผูก หรือเว้นไว้ก็ได้
            </p>
          )}
          <div className="relative">
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setOpen(true);
              }}
              onFocus={() => setOpen(true)}
              onBlur={() => setTimeout(() => setOpen(false), 150)}
              placeholder="พิมพ์ค้นหา รหัสลูกค้า / ชื่อ / เบอร์โทร / LINE ID"
              className="input"
              autoComplete="off"
            />
            {open && (
              <ul className="absolute z-10 mt-1 max-h-72 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                {matches.map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => choose(c)}
                      className="flex w-full flex-wrap gap-x-3 px-3 py-2 text-left hover:bg-brand-50"
                    >
                      {c.code && <span className="font-mono text-sm text-gray-400">{c.code}</span>}
                      <span className="font-medium">{c.name}</span>
                      <span className="text-sm text-gray-500">{c.phone}</span>
                      {c.lineId && <span className="text-sm text-gray-400">LINE: {c.lineId}</span>}
                    </button>
                  </li>
                ))}
                {matches.length === 0 && <li className="px-3 py-2 text-sm text-gray-500">ไม่พบลูกค้า</li>}
              </ul>
            )}
          </div>
          {adding ? (
            <QuickAdd
              defaultQuery={query}
              onCancel={() => setAdding(false)}
              onCreated={(c) => {
                setCustomers((list) => [...list, c].sort((a, b) => a.name.localeCompare(b.name, "th")));
                choose(c);
              }}
            />
          ) : (
            <button type="button" onClick={() => setAdding(true)} className="mt-2 text-sm font-medium text-brand-600 hover:underline">
              + เพิ่มลูกค้าใหม่
            </button>
          )}
        </>
      )}
    </div>
  );
}

// ฟอร์มย่อยเพิ่มลูกค้า (ไม่ใช่ <form> เพราะอยู่ในฟอร์มออเดอร์อีกที — กดปุ่มแล้วเรียก server action ตรง ๆ)
function QuickAdd({
  defaultQuery,
  onCancel,
  onCreated,
}: {
  defaultQuery: string;
  onCancel: () => void;
  onCreated: (c: PickerCustomer) => void;
}) {
  const looksLikePhone = phoneDigits(defaultQuery).length >= 4 && !/[a-zก-๙]/i.test(defaultQuery);
  const [name, setName] = useState(looksLikePhone ? "" : defaultQuery.trim());
  const [phone, setPhone] = useState(looksLikePhone ? defaultQuery.trim() : "");
  const [lineId, setLineId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const save = () =>
    startTransition(async () => {
      const res = await quickCreateCustomer({ name, phone, lineId });
      if ("error" in res) setError(res.error ?? "บันทึกไม่สำเร็จ");
      else onCreated(res.customer);
    });

  return (
    <div className="mt-2 rounded-lg border border-gray-200 bg-gray-50 p-3">
      <p className="mb-2 text-sm font-semibold">เพิ่มลูกค้าใหม่</p>
      <div className="grid gap-2 sm:grid-cols-3">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="ชื่อลูกค้า *" className="input" />
        <input value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" placeholder="เบอร์โทร" className="input" />
        <input value={lineId} onChange={(e) => setLineId(e.target.value)} placeholder="LINE ID" className="input" />
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <button type="button" onClick={save} disabled={pending} className="btn-primary py-1.5 text-sm">
          {pending ? "กำลังบันทึก..." : "บันทึกและเลือกลูกค้านี้"}
        </button>
        <button type="button" onClick={onCancel} className="text-sm text-gray-500 hover:underline">ยกเลิก</button>
        {error && <span className="text-sm text-brand-600">{error}</span>}
      </div>
      <p className="mt-2 text-xs text-gray-500">ที่อยู่และหมายเหตุ เพิ่มภายหลังได้ที่เมนูลูกค้า</p>
    </div>
  );
}
