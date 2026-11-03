"use client";

import { useState } from "react";
import { balanceOf, currencyLabel, formatMoney, grandTotalOf, handlingFeeOf, handlingFeeOptions, type CurrencyCode } from "@/lib/money";

type Props = {
  shopName?: string | null;
  currency?: CurrencyCode;
  totalAmount?: number | null;
  depositAmount?: number | null;
  handlingFeePct?: number;
};

// ร้านค้า ค่าสินค้า (ยอดเต็ม / มัดจำ / ค้างชำระ คำนวณให้ทันทีที่พิมพ์) และค่าดำเนินการของร้าน (% ของค่าสินค้า)
export function PaymentFields({ shopName, currency: initialCurrency = "THB", totalAmount, depositAmount, handlingFeePct = 5 }: Props) {
  const [currency, setCurrency] = useState<CurrencyCode>(initialCurrency);
  const [total, setTotal] = useState(totalAmount == null ? "" : String(totalAmount));
  const [deposit, setDeposit] = useState(depositAmount == null ? "" : String(depositAmount));
  const [pct, setPct] = useState(handlingFeePct);
  const goods = total === "" ? null : Number(total);

  const balance = balanceOf(total === "" ? null : Number(total), deposit === "" ? null : Number(deposit));
  const overpaid = balance != null && balance < 0;

  return (
    <div className="grid gap-4 sm:col-span-2 sm:grid-cols-2 lg:grid-cols-4">
      <label className="block sm:col-span-2 lg:col-span-4">
        <span className="mb-1 block text-sm text-gray-600">ชื่อร้านค้า</span>
        <input name="shopName" defaultValue={shopName ?? ""} className="input" autoComplete="off" />
      </label>
      <label className="block">
        <span className="mb-1 block text-sm text-gray-600">ค่าสินค้า (ยอดเต็ม)</span>
        {/* .input กว้างเต็มช่องเสมอ จึงคุมความกว้างด้วย span ที่ครอบ */}
        <div className="flex gap-1">
          <span className="min-w-0 flex-1">
            <input
              name="totalAmount"
              type="number"
              step="0.01"
              min={0}
              value={total}
              onChange={(e) => setTotal(e.target.value)}
              className="input"
            />
          </span>
          <span className="w-24 shrink-0">
            <select
              name="currency"
              value={currency}
              onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
              className="input"
              aria-label="สกุลเงิน"
            >
              {(Object.keys(currencyLabel) as CurrencyCode[]).map((c) => (
                <option key={c} value={c}>{currencyLabel[c]}</option>
              ))}
            </select>
          </span>
        </div>
      </label>
      <label className="block">
        <span className="mb-1 block text-sm text-gray-600">มัดจำค่าสินค้า</span>
        <input
          name="depositAmount"
          type="number"
          step="0.01"
          min={0}
          value={deposit}
          onChange={(e) => setDeposit(e.target.value)}
          className="input"
        />
      </label>
      <div className="lg:col-span-2">
        <span className="mb-1 block text-sm text-gray-600">ค่าสินค้าค้างชำระ (คำนวณอัตโนมัติ)</span>
        <p
          className={`rounded-lg px-3 py-2 font-semibold ${
            balance == null
              ? "bg-gray-50 text-gray-400"
              : overpaid
                ? "bg-amber-50 text-amber-800"
                : balance === 0
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-brand-50 text-brand-700"
          }`}
        >
          {balance == null
            ? "ใส่ยอดเงินเต็มก่อน"
            : overpaid
              ? `มัดจำเกินยอดเต็ม ${formatMoney(-balance, currency)}`
              : balance === 0
                ? "ชำระครบแล้ว"
                : formatMoney(balance, currency)}
        </p>
      </div>
      <label className="block">
        <span className="mb-1 block text-sm text-gray-600">ค่าดำเนินการ (บวกในราคาสินค้า)</span>
        <select name="handlingFeePct" value={pct} onChange={(e) => setPct(Number(e.target.value))} className="input">
          {handlingFeeOptions.map((p) => (
            <option key={p} value={p}>{p === 0 ? "0% (ไม่คิดค่าดำเนินการ)" : `${p}% ของค่าสินค้า`}</option>
          ))}
        </select>
      </label>
      <div className="lg:col-span-3">
        <span className="mb-1 block text-sm text-gray-600">ใบเสนอราคาบวก % นี้เข้าไปในราคาต่อหน่วย ลูกค้าไม่เห็นค่าดำเนินการแยก</span>
        <p className="rounded-lg bg-gray-50 px-3 py-2 text-sm">
          {goods == null ? (
            <span className="text-gray-400">ใส่ค่าสินค้าก่อน</span>
          ) : (
            <>
              ค่าดำเนินการ {pct}% = <b>{formatMoney(handlingFeeOf(goods, pct), currency)}</b> · รวมทั้งสิ้น{" "}
              <b className="text-brand-700">{formatMoney(grandTotalOf(goods, pct), currency)}</b>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
