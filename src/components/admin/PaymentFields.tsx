"use client";

import { useState } from "react";
import { balanceOf, currencyLabel, formatMoney, grandTotalOf, handlingFeeOf, handlingFeeOptions, type CurrencyCode } from "@/lib/money";

type Props = {
  shopName?: string | null;
  hideShopOnQuote?: boolean;
  currency?: CurrencyCode;
  totalAmount?: number | null;
  depositAmount?: number | null;
  handlingFeePct?: number;
  // ออเดอร์มีรายการชำระเงินแล้ว: ยอดจ่าย/ค้างคิดจากส่วน "การชำระเงิน" แทนช่องมัดจำ
  paymentsLinked?: boolean;
  // เรทหยวนตอนสั่งซื้อ (ออเดอร์ใหม่ = เรทใบเสนอราคาวันนี้ แก้ได้)
  orderRate?: number | null;
  costAmount?: number | null;
};

// ร้านค้า ค่าสินค้า (ยอดเต็ม / มัดจำ / ค้างชำระ คำนวณให้ทันทีที่พิมพ์) และค่าดำเนินการของร้าน (% ของค่าสินค้า)
export function PaymentFields({ shopName, hideShopOnQuote = false, currency: initialCurrency = "THB", totalAmount, depositAmount, handlingFeePct = 5, paymentsLinked = false, orderRate, costAmount }: Props) {
  const [currency, setCurrency] = useState<CurrencyCode>(initialCurrency);
  const [total, setTotal] = useState(totalAmount == null ? "" : String(totalAmount));
  const [deposit, setDeposit] = useState(depositAmount == null ? "" : String(depositAmount));
  const [pct, setPct] = useState(handlingFeePct);
  const goods = total === "" ? null : Number(total);

  const balance = balanceOf(total === "" ? null : Number(total), deposit === "" ? null : Number(deposit));
  const overpaid = balance != null && balance < 0;

  return (
    <div className="grid gap-4 sm:col-span-2 sm:grid-cols-2 lg:grid-cols-4">
      <div className="sm:col-span-2 lg:col-span-4">
        <label className="block">
          <span className="mb-1 block text-sm text-gray-600">ชื่อร้านค้า</span>
          <input name="shopName" defaultValue={shopName ?? ""} className="input" autoComplete="off" />
        </label>
        {/* ใช้ร้านที่เราหามาเอง: ซ่อนชื่อร้านในใบเสนอราคา กันลูกค้าไปติดต่อร้านตรง — ช่องติ๊กกรอบแดงให้เห็นชัด */}
        <label className="mt-2 inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-brand-600">
          <input
            type="checkbox"
            name="hideShopOnQuote"
            value="1"
            defaultChecked={hideShopOnQuote}
            className="h-4 w-4 shrink-0 cursor-pointer appearance-none rounded border-2 border-brand-600 bg-white bg-center bg-no-repeat checked:bg-brand-600 checked:bg-[url('data:image/svg+xml;utf8,<svg%20xmlns=%22http://www.w3.org/2000/svg%22%20viewBox=%220%200%2016%2016%22><path%20d=%22M3.5%208.5l3%203%206-7%22%20fill=%22none%22%20stroke=%22white%22%20stroke-width=%222.2%22%20stroke-linecap=%22round%22%20stroke-linejoin=%22round%22/></svg>')]"
          />
          ไม่แสดงร้านค้าในใบเสนอราคา
        </label>
      </div>
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
        <span className="mb-1 block text-sm text-gray-600">เรทตอนสั่งซื้อ (บาท / 1 หยวน)</span>
        <span className="block w-32">
          <input name="orderRate" type="number" step="0.0001" min={0} defaultValue={orderRate ?? ""} placeholder="เช่น 5.05" className="input" />
        </span>
      </label>
      <label className="block">
        <span className="mb-1 block text-sm text-gray-600">ยอดที่จ่ายสั่งซื้อจริง / ต้นทุน ({currencyLabel[currency]}, ภายใน)</span>
        <span className="block w-40">
          <input name="costAmount" type="number" step="0.01" min={0} defaultValue={costAmount ?? ""} className="input" />
        </span>
      </label>
      {paymentsLinked ? (
        <div className="lg:col-span-2">
          {/* เก็บค่ามัดจำเดิมไว้ ไม่ให้หายตอนบันทึก */}
          <input type="hidden" name="depositAmount" value={deposit} />
          <span className="mb-1 block text-sm text-gray-600">ยอดชำระ / ค้างชำระ</span>
          <p className="rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-600">คำนวณจากส่วน &quot;การชำระเงิน&quot; ด้านบน (ช่องมัดจำไม่ใช้แล้วสำหรับออเดอร์นี้)</p>
        </div>
      ) : (
        <>
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
          <div>
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
        </>
      )}
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
