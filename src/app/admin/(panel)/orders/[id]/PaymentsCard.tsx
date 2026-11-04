import Link from "next/link";
import { Card, Field } from "@/components/admin/ui";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { currencies, type Order, type Payment } from "@/db/schema";
import { formatThaiDateTime, nowLocalInputValue } from "@/lib/datetime";
import { currencyLabel, formatMoney, grandTotalOf, orderBalance, paidOf } from "@/lib/money";
import { addPayment, deletePayment } from "../actions";

// ช่องทางที่ใช้บ่อย (พิมพ์อย่างอื่นเองได้)
const METHOD_SUGGESTIONS = ["โอนธนาคาร", "พร้อมเพย์", "เงินสด", "Alipay", "WeChat Pay"];

type OrderMoney = Pick<Order, "id" | "currency" | "totalAmount" | "depositAmount" | "handlingFeePct">;

// การชำระเงินของออเดอร์: ยอดที่ลูกค้าโอน วันที่ชำระ ช่องทาง — กด "แก้ไขการชำระเงิน" (?pay=1) จึงเพิ่ม/ลบได้
// ยอดที่โอนคนละสกุลกับออเดอร์ แสดง "คิดเป็น" สกุลออเดอร์ด้วย (ใช้หักยอดค้างชำระ)
export function PaymentsCard({ order, payments, editing }: { order: OrderMoney; payments: Payment[]; editing: boolean }) {
  const sorted = [...payments].sort((a, b) => a.paidAt.getTime() - b.paidAt.getTime());
  const cur = order.currency;
  const other = currencies.find((c) => c !== cur)!;
  const grand = grandTotalOf(order.totalAmount, order.handlingFeePct);
  const balance = orderBalance(order, payments);

  return (
    // id="payments" ให้กดปุ่มแล้วหน้าเลื่อนมาที่ส่วนนี้เลย
    <div id="payments" className="scroll-mt-4">
      <Card
        title={`การชำระเงิน (${sorted.length})`}
        actions={
          <Link
            href={editing ? `/admin/orders/${order.id}#payments` : `/admin/orders/${order.id}?pay=1#payments`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-brand-600 px-3 py-1.5 text-sm font-medium text-brand-600 hover:bg-brand-50"
          >
            {editing ? "✓ เสร็จแล้ว" : "✏️ แก้ไขการชำระเงิน"}
          </Link>
        }
      >
        {sorted.length === 0 ? (
          <p className="text-sm text-gray-500">ยังไม่มีการชำระเงิน{!editing && " — กด \"แก้ไขการชำระเงิน\" เพื่อบันทึกยอดที่ลูกค้าโอน"}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-gray-500">
                <tr>
                  <th className="py-2 pr-4">วันที่ชำระ</th>
                  <th className="py-2 pr-4 text-right">ยอดโอน</th>
                  <th className="py-2 pr-4 text-right">คิดเป็น ({currencyLabel[cur]})</th>
                  <th className="py-2 pr-4">ช่องทาง</th>
                  <th className="py-2 pr-4">หมายเหตุ</th>
                  {editing && <th className="py-2" aria-label="ลบ" />}
                </tr>
              </thead>
              <tbody>
                {sorted.map((p) => (
                  <tr key={p.id} className="border-t border-gray-100">
                    <td className="py-2 pr-4 whitespace-nowrap">{formatThaiDateTime(p.paidAt)}</td>
                    <td className="py-2 pr-4 text-right font-semibold whitespace-nowrap">{formatMoney(p.amount, p.currency)}</td>
                    <td className="py-2 pr-4 text-right whitespace-nowrap">
                      {formatMoney(p.appliedAmount, cur)}
                      {p.rate != null && <span className="block text-xs text-gray-500">เรท {p.rate} บาท/หยวน</span>}
                    </td>
                    <td className="py-2 pr-4">{p.method}</td>
                    <td className="py-2 pr-4 text-gray-600">{p.note ?? "-"}</td>
                    {editing && (
                      <td className="py-2 text-right">
                        <form>
                          <input type="hidden" name="paymentId" value={p.id} />
                          <ConfirmButton formAction={deletePayment} message={`ลบรายการชำระ ${formatMoney(p.amount, p.currency)}?`}>ลบ</ConfirmButton>
                        </form>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-gray-200">
                  <td className="py-2 pr-4 font-medium" colSpan={2}>รวมชำระแล้ว</td>
                  <td className="py-2 pr-4 text-right font-bold whitespace-nowrap text-green-700">{formatMoney(paidOf(order, payments), cur)}</td>
                  <td colSpan={editing ? 3 : 2} />
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {/* สรุปยอด: รวมเป็นเงินทั้งสิ้น − ชำระแล้ว = ค้างชำระ */}
        {grand != null && (
          <p className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm">
            <span>รวมเป็นเงินทั้งสิ้น <b>{formatMoney(grand, cur)}</b></span>
            <span>ชำระแล้ว <b className="text-green-700">{formatMoney(paidOf(order, payments) ?? 0, cur)}</b></span>
            <span>
              {balance != null && balance < 0 ? "ชำระเกิน " : "ค้างชำระ "}
              <b className={balance != null && balance > 0 ? "text-brand-700" : "text-green-700"}>{formatMoney(Math.abs(balance ?? 0), cur)}</b>
            </span>
          </p>
        )}

        {editing && (
          <form action={addPayment} className="mt-4 grid gap-3 rounded-lg bg-gray-50 p-4 sm:grid-cols-2 lg:grid-cols-5">
            <input type="hidden" name="orderId" value={order.id} />
            <Field label="ยอดโอน *">
              <input name="amount" type="number" step="0.01" min={0.01} required className="input bg-white" />
            </Field>
            <Field label="สกุลเงิน">
              <select name="currency" defaultValue={cur} className="input bg-white">
                {currencies.map((c) => <option key={c} value={c}>{currencyLabel[c]}</option>)}
              </select>
            </Field>
            <Field label="วันที่ชำระ *">
              <input name="paidAt" type="datetime-local" required defaultValue={nowLocalInputValue()} className="input bg-white" />
            </Field>
            <Field label="ช่องทางการชำระ *">
              <input name="method" required list="payment-methods" placeholder="เช่น โอนธนาคาร กสิกร" className="input bg-white" />
              <datalist id="payment-methods">
                {METHOD_SUGGESTIONS.map((m) => <option key={m} value={m} />)}
              </datalist>
            </Field>
            <Field label="หมายเหตุ">
              <input name="note" placeholder="เช่น มัดจำ, ส่วนที่เหลือ" className="input bg-white" />
            </Field>
            <Field label={`ถ้าโอนเป็น${currencyLabel[other]}: คิดเป็นกี่${currencyLabel[cur]}`} className="sm:col-span-2">
              <input name="appliedAmount" type="number" step="0.01" min={0.01} placeholder="เว้นว่าง = แปลงด้วยเรทใบเสนอราคาวันนี้" className="input bg-white" />
            </Field>
            <div className="flex items-end sm:col-span-2 lg:col-span-3">
              <button className="btn-primary">+ บันทึกการชำระเงิน</button>
            </div>
          </form>
        )}
      </Card>
    </div>
  );
}
