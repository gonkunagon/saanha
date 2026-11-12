"use client";

import { useState } from "react";
import { balanceOf, currencyLabel, customerTotalOf, formatMoney, supplierTotalOf, type CurrencyCode } from "@/lib/money";

type Props = {
  shopName?: string | null;
  hideShopOnQuote?: boolean;
  currency?: CurrencyCode;
  totalAmount?: number | null;
  chinaShippingFee?: number | null;
  costRate?: number | null;
  customerGoodsAmount?: number | null;
  customerChinaShipping?: number | null;
  depositAmount?: number | null;
  balancePaidAmount?: number | null;
  // ออเดอร์เก่าที่ยังไม่กรอกราคาลูกค้า: ราคาลูกค้า = ค่าสินค้า + % นี้ (ออเดอร์ใหม่ = 0)
  handlingFeePct?: number;
  // ออเดอร์มีรายการชำระเงินแล้ว: ยอดจ่าย/ค้างคิดจากส่วน "การชำระเงิน" แทนช่องมัดจำ
  paymentsLinked?: boolean;
  // เรทคิดลูกค้า (ออเดอร์ใหม่ = เรทใบเสนอราคาวันนี้ แก้ได้)
  orderRate?: number | null;
  // ค่าสินค้าคิดจากตารางรายการสินค้า (ราคาซื้อ / ราคาขาย × จำนวน) — ช่องอ่านอย่างเดียว แก้ราคาที่ตาราง
  goodsFromItems?: { buy: boolean; sell: boolean };
};

const str = (v: number | null | undefined) => (v == null ? "" : String(v));
const numOrNull = (v: string) => (v.trim() === "" ? null : Number(v));
const thb = (amount: number | null, rate: number | null, currency: CurrencyCode) =>
  amount == null ? null : currency === "THB" ? amount : rate ? Math.round(amount * rate * 100) / 100 : null;

function Box({ title, note, children }: { title: string; note: string; children: React.ReactNode }) {
  return (
    <fieldset className="grid gap-4 rounded-lg border border-gray-200 p-4 sm:col-span-2 sm:grid-cols-2 lg:col-span-4 lg:grid-cols-4">
      <legend className="px-1 text-sm font-semibold text-gray-800">
        {title} <span className="font-normal text-gray-500">· {note}</span>
      </legend>
      {children}
    </fieldset>
  );
}

const LOCKED = "bg-gray-50 text-gray-700";
const FROM_TABLE = "คิดจากตารางรายการสินค้า";
function Num({ label, name, value, onChange, placeholder, step = "0.01", locked }: { label: string; name: string; value: string; onChange: (v: string) => void; placeholder?: string; step?: string; locked?: boolean }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm text-gray-600">{label}</span>
      <input name={name} type="number" step={step} min={0} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} readOnly={locked} className={`input ${locked ? LOCKED : ""}`} />
      {locked && <span className="mt-1 block text-xs text-gray-500">{FROM_TABLE}</span>}
    </label>
  );
}

function Calc({ label, amount, baht, currency, strong }: { label: string; amount: number | null; baht: number | null; currency: CurrencyCode; strong?: boolean }) {
  return (
    <div>
      <span className="mb-1 block text-sm text-gray-600">{label}</span>
      <p className={`rounded-lg px-3 py-2 text-sm ${strong ? "bg-brand-50 text-brand-700" : "bg-gray-50 text-gray-700"}`}>
        {amount == null ? (
          <span className="text-gray-400">ใส่ค่าสินค้าก่อน</span>
        ) : (
          <>
            <b>{formatMoney(amount, currency)}</b>
            {currency === "CNY" && <span className="block text-xs">{baht == null ? "ใส่เรทเพื่อดูยอดบาท" : `≈ ${formatMoney(baht, "THB")}`}</span>}
          </>
        )}
      </p>
    </div>
  );
}

// ร้านค้า + ยอดเงิน 2 ฝั่ง: "ยอดที่จ่ายร้านค้า" (ทุน + เรทที่เราจ่ายจริง) และ "ยอดที่คิดลูกค้า" (ราคาลูกค้า + เรทลูกค้า)
// ยอดค้างชำระของลูกค้า คิดจากฝั่งลูกค้า · กำไรดูได้ที่หน้าออเดอร์ (เฉพาะแอดมิน)
export function PaymentFields(p: Props) {
  const [currency, setCurrency] = useState<CurrencyCode>(p.currency ?? "CNY");
  const [goods, setGoods] = useState(str(p.totalAmount));
  const [ship, setShip] = useState(str(p.chinaShippingFee));
  const [costRate, setCostRate] = useState(str(p.costRate));
  const [custGoods, setCustGoods] = useState(str(p.customerGoodsAmount));
  const [custShip, setCustShip] = useState(str(p.customerChinaShipping));
  const [rate, setRate] = useState(str(p.orderRate));
  const [deposit, setDeposit] = useState(str(p.depositAmount));
  const [rest, setRest] = useState(str(p.balancePaidAmount));
  const pct = p.handlingFeePct ?? 0;

  const money = {
    totalAmount: numOrNull(goods),
    chinaShippingFee: numOrNull(ship),
    customerGoodsAmount: numOrNull(custGoods),
    customerChinaShipping: numOrNull(custShip),
    handlingFeePct: pct,
  };
  const supplier = supplierTotalOf(money);
  const customer = customerTotalOf(money);
  const balance = balanceOf(customer, (Number(deposit) || 0) + (Number(rest) || 0));
  const afterDeposit = balanceOf(customer, Number(deposit) || 0);
  const overpaid = balance != null && balance < 0;
  const cur = currencyLabel[currency];

  return (
    <div className="grid gap-4 sm:col-span-2 sm:grid-cols-2 lg:grid-cols-4">
      <div className="sm:col-span-2 lg:col-span-4">
        <label className="block">
          <span className="mb-1 block text-sm text-gray-600">ชื่อร้านค้า</span>
          <input name="shopName" defaultValue={p.shopName ?? ""} className="input" autoComplete="off" />
        </label>
        {/* ใช้ร้านที่เราหามาเอง: ซ่อนชื่อร้านในใบเสนอราคา กันลูกค้าไปติดต่อร้านตรง — ช่องติ๊กกรอบแดงให้เห็นชัด */}
        <label className="mt-2 inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-brand-600">
          <input
            type="checkbox"
            name="hideShopOnQuote"
            value="1"
            defaultChecked={p.hideShopOnQuote}
            className="h-4 w-4 shrink-0 cursor-pointer appearance-none rounded border-2 border-brand-600 bg-white bg-center bg-no-repeat checked:bg-brand-600 checked:bg-[url('data:image/svg+xml;utf8,<svg%20xmlns=%22http://www.w3.org/2000/svg%22%20viewBox=%220%200%2016%2016%22><path%20d=%22M3.5%208.5l3%203%206-7%22%20fill=%22none%22%20stroke=%22white%22%20stroke-width=%222.2%22%20stroke-linecap=%22round%22%20stroke-linejoin=%22round%22/></svg>')]"
          />
          ไม่แสดงร้านค้าในใบเสนอราคา
        </label>
      </div>

      <input type="hidden" name="handlingFeePct" value={pct} />

      <Box title="ยอดที่จ่ายร้านค้า" note="ต้นทุนของเรา ลูกค้าไม่เห็น">
        <label className="block">
          <span className="mb-1 block text-sm text-gray-600">ค่าสินค้า (จ่ายร้าน)</span>
          {/* .input กว้างเต็มช่องเสมอ จึงคุมความกว้างด้วย span ที่ครอบ */}
          <div className="flex gap-1">
            <span className="min-w-0 flex-1">
              <input name="totalAmount" type="number" step="0.01" min={0} value={goods} onChange={(e) => setGoods(e.target.value)} readOnly={p.goodsFromItems?.buy} className={`input ${p.goodsFromItems?.buy ? LOCKED : ""}`} />
            </span>
            <span className="w-24 shrink-0">
              <select name="currency" value={currency} onChange={(e) => setCurrency(e.target.value as CurrencyCode)} className="input" aria-label="สกุลเงิน">
                {(Object.keys(currencyLabel) as CurrencyCode[]).map((c) => (
                  <option key={c} value={c}>{currencyLabel[c]}</option>
                ))}
              </select>
            </span>
          </div>
          {p.goodsFromItems?.buy && <span className="mt-1 block text-xs text-gray-500">{FROM_TABLE}</span>}
        </label>
        <Num label={`ค่าขนส่งภายในจีน (จ่ายร้าน) · ${cur}`} name="chinaShippingFee" value={ship} onChange={setShip} placeholder="ถ้าร้านคิดค่าส่งมาโกดัง" />
        <Num label="เรทที่เราจ่าย (บาท / 1 หยวน)" name="costRate" value={costRate} onChange={setCostRate} placeholder="เช่น 5.00" step="0.0001" />
        <Calc label="รวมจ่ายร้าน" amount={supplier} baht={thb(supplier, numOrNull(costRate), currency)} currency={currency} />
      </Box>

      <Box title="ยอดที่คิดลูกค้า" note="ใช้ในใบเสนอราคาและยอดค้างชำระ">
        <Num
          label={`ค่าสินค้า (คิดลูกค้า) · ${cur}`}
          name="customerGoodsAmount"
          value={custGoods}
          onChange={setCustGoods}
          placeholder={pct > 0 ? `เว้นว่าง = ค่าสินค้า + ${pct}%` : "ราคาที่คิดลูกค้า"}
          locked={p.goodsFromItems?.sell}
        />
        <Num label={`ค่าขนส่งภายในจีน (คิดลูกค้า) · ${cur}`} name="customerChinaShipping" value={custShip} onChange={setCustShip} placeholder="เว้นว่าง = เท่าที่จ่ายร้าน" />
        <Num label="เรทคิดลูกค้า (บาท / 1 หยวน)" name="orderRate" value={rate} onChange={setRate} placeholder="เช่น 5.20" step="0.0001" />
        <Calc label="รวมเป็นเงินทั้งสิ้น (คิดลูกค้า)" amount={customer} baht={thb(customer, numOrNull(rate), currency)} currency={currency} strong />

        {p.paymentsLinked ? (
          <div className="sm:col-span-2 lg:col-span-4">
            {/* เก็บค่ามัดจำ / ยอดที่เหลือเดิมไว้ ไม่ให้หายตอนบันทึก */}
            <input type="hidden" name="depositAmount" value={deposit} />
            <input type="hidden" name="balancePaidAmount" value={rest} />
            <span className="mb-1 block text-sm text-gray-600">ยอดชำระ / ค้างชำระ</span>
            <p className="rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-600">คำนวณจากส่วน &quot;การชำระเงิน&quot; ด้านบน (ช่องมัดจำไม่ใช้แล้วสำหรับออเดอร์นี้)</p>
          </div>
        ) : (
          <>
            <Num label="มัดจำค่าสินค้า" name="depositAmount" value={deposit} onChange={setDeposit} />
            <div>
              <span className="mb-1 flex items-baseline justify-between gap-2 text-sm text-gray-600">
                ชำระยอดที่เหลือ
                {afterDeposit != null && afterDeposit > 0 && (
                  <button type="button" onClick={() => setRest(String(afterDeposit))} className="text-xs font-medium text-brand-600 hover:underline">
                    ใส่ยอดที่เหลือ {formatMoney(afterDeposit, currency)}
                  </button>
                )}
              </span>
              <input name="balancePaidAmount" type="number" step="0.01" min={0} value={rest} onChange={(e) => setRest(e.target.value)} className="input" />
            </div>
            <div className="sm:col-span-2">
              <span className="mb-1 block text-sm text-gray-600">ยอดค้างชำระ (คำนวณอัตโนมัติ)</span>
              <p
                className={`rounded-lg px-3 py-2 font-semibold ${
                  balance == null ? "bg-gray-50 text-gray-400" : overpaid ? "bg-amber-50 text-amber-800" : balance === 0 ? "bg-emerald-50 text-emerald-700" : "bg-brand-50 text-brand-700"
                }`}
              >
                {balance == null
                  ? "ใส่ยอดที่คิดลูกค้าก่อน"
                  : overpaid
                    ? `ชำระเกินยอดรวม ${formatMoney(-balance, currency)}`
                    : balance === 0
                      ? "ชำระครบแล้ว"
                      : formatMoney(balance, currency)}
              </p>
            </div>
          </>
        )}
      </Box>
    </div>
  );
}
