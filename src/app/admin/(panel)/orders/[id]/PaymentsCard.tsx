import Link from "next/link";
import { Field } from "@/components/admin/ui";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { currencies, type Order, type Payment, type PaymentDirection } from "@/db/schema";
import { formatThaiDateTime, nowLocalInputValue } from "@/lib/datetime";
import { currencyLabel, formatMoney } from "@/lib/money";
import { thaiBanks } from "@/lib/banks";
import { getQuoteRate } from "@/lib/settings";
import { addPayment, deletePayment, updatePaymentRate } from "../actions";

// ช่องทางการชำระ (เลือกจากรายการ)
const PAYMENT_METHODS = ["โอนธนาคาร", "พร้อมเพย์", "เงินสด", "บัตรเครดิต / เดบิต", "Alipay", "WeChat Pay", "อื่นๆ"];

const TEXT: Record<PaymentDirection, { title: string; empty: string; date: string; bank: string; add: string; paid: string; defaultRate: string }> = {
  in: {
    title: "การรับเงินจากลูกค้า",
    empty: "ยังไม่มีรายการรับเงินจากลูกค้า",
    date: "วันที่ลูกค้าโอน",
    bank: "เข้าบัญชี (ธนาคารของเรา)",
    add: "+ บันทึกรับเงินจากลูกค้า",
    paid: "รวมรับจากลูกค้า",
    defaultRate: "เรทคิดลูกค้า",
  },
  out: {
    title: "การจ่ายเงินให้ร้านค้า",
    empty: "ยังไม่มีรายการจ่ายเงินให้ร้านค้า",
    date: "วันที่จ่าย",
    bank: "จ่ายจากบัญชี (ธนาคารของเรา)",
    add: "+ บันทึกจ่ายเงินร้านค้า",
    paid: "รวมจ่ายร้านแล้ว",
    defaultRate: "เรทที่เราจ่าย",
  },
};

// รายการเงินเข้า/ออกของออเดอร์ (แสดงในกล่อง "ยอดที่คิดลูกค้า" / "ยอดที่จ่ายร้านค้า")
// in = ลูกค้าโอนเข้าบัญชีเรา (หักยอดค้างชำระ) · out = เราโอนจ่ายร้านค้า (ใช้หาเรทที่เราจ่ายจริง)
// กด "แก้ไข" (?pay=in / ?pay=out) จึงเพิ่ม/ลบ/แก้เรทได้
export async function PaymentsPanel({
  order,
  payments,
  direction,
  editing,
}: {
  order: Pick<Order, "id" | "currency" | "orderRate" | "costRate">;
  payments: Payment[];
  direction: PaymentDirection;
  editing: boolean;
}) {
  const t = TEXT[direction];
  const list = payments.filter((p) => p.direction === direction).sort((a, b) => a.paidAt.getTime() - b.paidAt.getTime());
  const cur = order.currency;
  const other = currencies.find((c) => c !== cur)!;
  const total = Math.round(list.reduce((s, p) => s + p.appliedAmount, 0) * 100) / 100;
  // เรทตั้งต้นตอนบันทึก (เว้นว่าง): เรทของออเดอร์ฝั่งนั้น · ไม่มี = เรทใบเสนอราคาวันนี้
  const orderSideRate = direction === "in" ? order.orderRate : order.costRate;
  const todayRate = editing && orderSideRate == null ? (await getQuoteRate()).rate : null;
  const fallbackRate = orderSideRate ?? todayRate;
  const anchor = `pay-${direction}`;

  return (
    <div id={anchor} className="mt-4 scroll-mt-4 border-t border-black/10 pt-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-sm font-semibold text-gray-800">
          {t.title} ({list.length})
        </h4>
        <Link
          href={editing ? `/admin/orders/${order.id}#${anchor}` : `/admin/orders/${order.id}?pay=${direction}#${anchor}`}
          className="inline-flex items-center gap-1.5 rounded-lg border border-brand-600 bg-white px-3 py-1 text-xs font-medium text-brand-600 hover:bg-brand-50"
        >
          {editing ? "✓ เสร็จแล้ว" : "✏️ แก้ไข"}
        </Link>
      </div>

      {list.length === 0 ? (
        <p className="text-sm text-gray-500">{t.empty}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-gray-500">
              <tr>
                <th className="py-1.5 pr-4">{t.date}</th>
                <th className="py-1.5 pr-4 text-right">ยอดโอน</th>
                <th className="py-1.5 pr-4 text-right">คิดเป็น ({currencyLabel[cur]})</th>
                <th className="py-1.5 pr-4 text-right">เรท</th>
                <th className="py-1.5 pr-4">ช่องทาง</th>
                <th className="py-1.5 pr-4">{t.bank}</th>
                {editing && <th className="py-1.5" aria-label="ลบ" />}
              </tr>
            </thead>
            <tbody>
              {list.map((p) => (
                <tr key={p.id} className="border-t border-black/5 align-top">
                  <td className="py-1.5 pr-4 whitespace-nowrap">{formatThaiDateTime(p.paidAt)}</td>
                  <td className="py-1.5 pr-4 text-right font-semibold whitespace-nowrap">{formatMoney(p.amount, p.currency)}</td>
                  <td className="py-1.5 pr-4 text-right whitespace-nowrap">{formatMoney(p.appliedAmount, cur)}</td>
                  <td className="py-1.5 pr-4 text-right whitespace-nowrap">
                    {p.rate == null ? (
                      <span className="text-gray-400">-</span>
                    ) : editing ? (
                      // แก้เรทเองได้ — ยอดที่คิดเป็นจะคำนวณใหม่
                      <form action={updatePaymentRate} className="flex items-center justify-end gap-1 text-xs">
                        <input type="hidden" name="paymentId" value={p.id} />
                        <input name="rate" type="number" step="0.0001" min={0.0001} required defaultValue={p.rate} aria-label="เรท บาทต่อหยวน" className="w-20 rounded border border-gray-300 bg-white px-1.5 py-0.5 text-right text-xs focus:border-brand-500 focus:outline-none" />
                        <button className="rounded border border-brand-600 bg-white px-1.5 py-0.5 font-medium text-brand-600 hover:bg-brand-50">บันทึก</button>
                      </form>
                    ) : (
                      <span>{p.rate} บาท/หยวน</span>
                    )}
                  </td>
                  <td className="py-1.5 pr-4">{p.method}</td>
                  <td className="py-1.5 pr-4 text-gray-600">{p.bank ?? p.note ?? "-"}</td>
                  {editing && (
                    <td className="py-1.5 text-right">
                      <form>
                        <input type="hidden" name="paymentId" value={p.id} />
                        <ConfirmButton formAction={deletePayment} message={`ลบรายการ ${formatMoney(p.amount, p.currency)}?`}>ลบ</ConfirmButton>
                      </form>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-black/10">
                <td className="py-1.5 pr-4 font-medium" colSpan={2}>{t.paid}</td>
                <td className="py-1.5 pr-4 text-right font-bold whitespace-nowrap text-green-700">{formatMoney(total, cur)}</td>
                <td colSpan={editing ? 4 : 3} />
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {editing && (
        <form action={addPayment} className="mt-3 grid gap-3 rounded-lg bg-white/70 p-3 ring-1 ring-black/5 sm:grid-cols-2 lg:grid-cols-4">
          <input type="hidden" name="orderId" value={order.id} />
          <input type="hidden" name="direction" value={direction} />
          <Field label="ยอดโอน *">
            <input name="amount" type="number" step="0.01" min={0.01} required className="input bg-white" />
          </Field>
          <Field label="สกุลเงินที่โอน">
            <select name="currency" defaultValue={cur === "CNY" ? "THB" : cur} className="input bg-white">
              {currencies.map((c) => <option key={c} value={c}>{currencyLabel[c]}</option>)}
            </select>
          </Field>
          <Field label={`เรท (บาท / 1 หยวน) — ใช้เมื่อโอนเป็น${currencyLabel[other]}`}>
            <input
              name="rate"
              type="number"
              step="0.0001"
              min={0.0001}
              placeholder={fallbackRate ? `เว้นว่าง = ${orderSideRate != null ? t.defaultRate : "เรทใบเสนอราคาวันนี้"} ${fallbackRate}` : "ใส่เรท เช่น 5.05"}
              className="input bg-white"
            />
          </Field>
          <Field label={`${t.date} *`}>
            <input name="paidAt" type="datetime-local" required defaultValue={nowLocalInputValue()} className="input bg-white" />
          </Field>
          <Field label="ช่องทาง *">
            <select name="method" required defaultValue={PAYMENT_METHODS[0]} className="input bg-white">
              {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </Field>
          <Field label={t.bank}>
            <select name="bank" defaultValue="" className="input bg-white">
              <option value="">— ไม่ได้โอนผ่านธนาคาร —</option>
              {thaiBanks.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
          </Field>
          <div className="flex items-end sm:col-span-2">
            <button className="btn-primary">{t.add}</button>
          </div>
        </form>
      )}
    </div>
  );
}
