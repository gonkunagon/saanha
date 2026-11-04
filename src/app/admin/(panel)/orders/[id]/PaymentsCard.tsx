import { Card, Field } from "@/components/admin/ui";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { currencies, type Payment } from "@/db/schema";
import { formatThaiDateTime, nowLocalInputValue } from "@/lib/datetime";
import { currencyLabel, formatMoney } from "@/lib/money";
import { addPayment, deletePayment } from "../actions";

// ช่องทางที่ใช้บ่อย (พิมพ์อย่างอื่นเองได้)
const METHOD_SUGGESTIONS = ["โอนธนาคาร", "พร้อมเพย์", "เงินสด", "Alipay", "WeChat Pay"];

// การชำระเงินของออเดอร์: ยอดที่ลูกค้าโอน วันที่ชำระ ช่องทาง — หน้าแก้ไขเพิ่ม/ลบได้
export function PaymentsCard({ orderId, payments, editing }: { orderId: number; payments: Payment[]; editing: boolean }) {
  const sorted = [...payments].sort((a, b) => a.paidAt.getTime() - b.paidAt.getTime());
  const totals = currencies
    .map((c) => ({ c, sum: sorted.filter((p) => p.currency === c).reduce((s, p) => s + p.amount, 0) }))
    .filter((t) => t.sum > 0);

  return (
    <Card title={`การชำระเงิน (${sorted.length})`}>
      {sorted.length === 0 ? (
        <p className="text-sm text-gray-500">ยังไม่มีการชำระเงิน{!editing && " — กด \"แก้ไข\" เพื่อบันทึกยอดที่ลูกค้าโอน"}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-gray-500">
              <tr>
                <th className="py-2 pr-4">วันที่ชำระ</th>
                <th className="py-2 pr-4 text-right">ยอดโอน</th>
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
                <td className="py-2 pr-4 font-medium">รวมชำระแล้ว</td>
                <td className="py-2 pr-4 text-right font-bold whitespace-nowrap text-green-700">
                  {totals.map((t) => <span key={t.c} className="block">{formatMoney(t.sum, t.c)}</span>)}
                </td>
                <td colSpan={editing ? 3 : 2} />
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {editing && (
        <form action={addPayment} className="mt-4 grid gap-3 rounded-lg bg-gray-50 p-4 sm:grid-cols-2 lg:grid-cols-5">
          <input type="hidden" name="orderId" value={orderId} />
          <Field label="ยอดโอน *">
            <input name="amount" type="number" step="0.01" min={0.01} required className="input bg-white" />
          </Field>
          <Field label="สกุลเงิน">
            <select name="currency" defaultValue="THB" className="input bg-white">
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
          <div className="sm:col-span-2 lg:col-span-5">
            <button className="btn-primary">+ บันทึกการชำระเงิน</button>
          </div>
        </form>
      )}
    </Card>
  );
}
