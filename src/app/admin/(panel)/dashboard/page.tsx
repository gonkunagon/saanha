import Link from "next/link";
import { desc } from "drizzle-orm";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { Card, BalanceText, ShippingOnlyBadge } from "@/components/admin/ui";
import { formatMoney, orderBalance, customerPaidRateOf, orderProfit, shopPaidRateOf, toThb } from "@/lib/money";
import { formatThaiDateTime } from "@/lib/datetime";
import { orderShippingOf } from "@/lib/shipping";

// Dashboard (เฉพาะแอดมิน): สรุปยอดขาย ต้นทุน กำไร ของแต่ละออเดอร์ เลือกดูรายเดือนได้ (นับตามวันที่สร้างออเดอร์ เวลาไทย)
// กำไร = ยอดที่คิดลูกค้า (บาท) − ยอดที่จ่ายร้าน (บาท) · ออเดอร์ที่ยังขาดเรท/ยอด ไม่นับรวมในกำไร และขึ้นเตือนว่าขาดอะไร

const monthKey = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: "Asia/Bangkok" }).slice(0, 7); // YYYY-MM
const monthLabel = (key: string) => {
  const [y, m] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 15)).toLocaleDateString("th-TH", { month: "long", year: "numeric", timeZone: "Asia/Bangkok" });
};
const baht = (n: number) => formatMoney(Math.round(n * 100) / 100, "THB");

function Stat({ label, value, note, tone }: { label: string; value: string; note?: string; tone?: "profit" | "loss" | "warn" }) {
  const color = tone === "profit" ? "text-emerald-700" : tone === "loss" ? "text-brand-700" : tone === "warn" ? "text-amber-700" : "text-gray-900";
  return (
    <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`mt-1 text-xl font-bold ${color}`}>{value}</p>
      {note && <p className="mt-0.5 text-xs text-gray-500">{note}</p>}
    </div>
  );
}

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  await requireAdmin();
  const sp = await searchParams;
  const all = await db.query.orders.findMany({
    with: {
      payments: { columns: { appliedAmount: true, amount: true, currency: true, direction: true } },
      // ค่าขนส่ง: คิวของรายการที่เข้าตู้แล้ว × เรทออเดอร์ (ขาย) / ต้นทุน/คิว ของตู้ (ทุน)
      items: { columns: { cbm: true }, with: { container: { columns: { costPerCbm: true } } } },
    },
    orderBy: desc(orders.createdAt),
  });

  const months = [...new Set([monthKey(new Date()), ...all.map((o) => monthKey(o.createdAt))])].sort().reverse();
  const month = sp.m === "all" ? "all" : sp.m && months.includes(sp.m) ? sp.m : months[0];
  // ออเดอร์ฝากส่งอย่างเดียวไม่มีค่าสินค้า — มีแต่ค่าขนส่ง
  const list = all.filter((o) => month === "all" || monthKey(o.createdAt) === month);

  const rows = list.map((o) => {
    // เรทที่เราจ่าย / เรทคิดลูกค้า: กรอกไว้ในออเดอร์ หรือเรทเฉลี่ยจากรายการจ่ายร้าน / รับเงินลูกค้า
    const p = orderProfit({ ...o, costRate: o.costRate ?? shopPaidRateOf(o.payments), orderRate: o.orderRate ?? customerPaidRateOf(o.payments) });
    const balance = orderBalance(o, o.payments);
    const ship = orderShippingOf(o.items, o.shippingRate);
    return { o, ...p, ship, balance, balanceThb: balance != null && balance > 0 ? toThb(balance, o.orderRate ?? customerPaidRateOf(o.payments), o.currency) : null };
  });
  const counted = rows.filter((r) => r.profit != null);
  const sum = (pick: (r: (typeof rows)[number]) => number | null) => counted.reduce((s, r) => s + (pick(r) ?? 0), 0);
  const sales = sum((r) => r.sellThb);
  const cost = sum((r) => r.costThb);
  const profit = sum((r) => r.profit);
  const margin = sales > 0 ? (profit / sales) * 100 : null;
  // ค่าขนส่ง: รวมเฉพาะออเดอร์ที่รู้ทั้งขายและทุน
  const shipCounted = rows.filter((r) => r.ship.profit != null);
  const shipSales = shipCounted.reduce((s, r) => s + r.ship.sell!, 0);
  const shipCost = shipCounted.reduce((s, r) => s + r.ship.cost!, 0);
  const shipProfit = shipSales - shipCost;
  // ยอดค่าขนส่งที่คิดลูกค้าทั้งหมด (รวมออเดอร์ที่ตู้ยังไม่ใส่ต้นทุน)
  const shipSalesAll = rows.reduce((s, r) => s + (r.ship.sell ?? 0), 0);
  const shipMissing = rows.filter((r) => r.ship.sell != null && r.ship.cost == null).length;
  const totalProfit = profit + shipProfit;
  const incomplete = rows.filter((r) => r.profit == null && (r.sell != null || r.cost != null));
  const owing = rows.filter((r) => r.balance != null && r.balance > 0);
  const owingThb = owing.reduce((s, r) => s + (r.balanceThb ?? 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        {/* เลือกเดือน (ส่งฟอร์ม GET ไม่ต้องใช้ JavaScript) */}
        <form className="flex items-center gap-2 text-sm">
          <label htmlFor="m" className="text-gray-600">เดือน</label>
          <select id="m" name="m" defaultValue={month} className="input w-48 py-1.5">
            {months.map((k) => (
              <option key={k} value={k}>{monthLabel(k)}</option>
            ))}
            <option value="all">ทั้งหมด</option>
          </select>
          <button className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 hover:bg-gray-100">ดู</button>
        </form>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Stat label="ออเดอร์" value={`${list.length} ออเดอร์`} note={`คิดกำไรค่าสินค้าได้ ${counted.length} ออเดอร์`} />
        <Stat label="ยอดขายสินค้า (คิดลูกค้า)" value={baht(sales)} />
        <Stat label="ต้นทุนสินค้า (จ่ายร้าน)" value={baht(cost)} />
        <Stat label="กำไรค่าสินค้า" value={baht(profit)} note={margin == null ? undefined : `อัตรากำไร ${margin.toFixed(1)}%`} tone={profit < 0 ? "loss" : "profit"} />
        <Stat
          label="ยอดค้างชำระ"
          value={baht(owingThb)}
          note={`${owing.length} ออเดอร์${owing.some((r) => r.balanceThb == null) ? " (บางออเดอร์ยังไม่มีเรท ไม่ได้รวมเป็นบาท)" : ""}`}
          tone={owing.length ? "warn" : undefined}
        />
      </div>

      {/* ค่าขนส่งจีน → ไทย (เฉพาะรายการที่เข้าตู้แล้ว) */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="ค่าขนส่ง (คิดลูกค้า)" value={baht(shipSalesAll)} note={`${rows.filter((r) => r.ship.sell != null).length} ออเดอร์ที่เข้าตู้แล้ว`} />
        <Stat
          label="ต้นทุนค่าขนส่ง"
          value={baht(shipCost)}
          note={shipMissing ? `อีก ${shipMissing} ออเดอร์ ตู้ยังไม่ใส่ต้นทุน/คิว (ไม่นับ)` : undefined}
          tone={shipMissing ? "warn" : undefined}
        />
        <Stat label="กำไรค่าขนส่ง" value={baht(shipProfit)} note={shipCounted.length === 0 ? "ใส่ต้นทุน/คิว ที่หน้าตู้ก่อน" : shipSales > 0 ? `อัตรากำไร ${((shipProfit / shipSales) * 100).toFixed(1)}%` : undefined} tone={shipProfit < 0 ? "loss" : "profit"} />
        <Stat label="กำไรรวม (สินค้า + ขนส่ง)" value={baht(totalProfit)} tone={totalProfit < 0 ? "loss" : "profit"} />
      </div>

      {incomplete.length > 0 && (
        <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900 ring-1 ring-amber-200">
          ⚠️ มี {incomplete.length} ออเดอร์ที่ยังคิดกำไรไม่ได้ (ไม่นับในยอดด้านบน) — ดูช่อง &quot;กำไร&quot; ในตารางว่าขาดข้อมูลอะไร
        </p>
      )}

      <Card title={`สรุปรายออเดอร์ · ${month === "all" ? "ทั้งหมด" : monthLabel(month)}`}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-gray-500">
              <tr className="[&>th]:py-2 [&>th]:pr-4 [&>th]:whitespace-nowrap">
                <th>เลขออเดอร์</th>
                <th>ลูกค้า</th>
                <th className="text-right">ยอดคิดลูกค้า</th>
                <th className="text-right">ขาย (บาท)</th>
                <th className="text-right">ทุน (บาท)</th>
                <th className="text-right">กำไร (บาท)</th>
                <th className="text-right">%</th>
                <th className="text-right">ค่าขนส่ง</th>
                <th className="text-right">ทุนขนส่ง</th>
                <th className="text-right">กำไรขนส่ง</th>
                <th>การชำระ</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.o.id} className="border-t border-gray-100 align-top [&>td]:py-2 [&>td]:pr-4">
                  <td className="whitespace-nowrap">
                    <Link href={`/admin/orders/${r.o.id}`} className="font-semibold text-brand-600 hover:underline">{r.o.code}</Link>
                    <span className="block text-xs text-gray-500">{formatThaiDateTime(r.o.createdAt)}</span>
                  </td>
                  <td>
                    {r.o.customerName}
                    {r.o.shippingOnly && <span className="ml-1.5"><ShippingOnlyBadge /></span>}
                  </td>
                  <td className="text-right whitespace-nowrap">{r.sell == null ? <span className="text-gray-400">-</span> : formatMoney(r.sell, r.o.currency)}</td>
                  <td className="text-right whitespace-nowrap">{r.sellThb == null ? <span className="text-gray-400">-</span> : baht(r.sellThb)}</td>
                  <td className="text-right whitespace-nowrap">{r.costThb == null ? <span className="text-gray-400">-</span> : baht(r.costThb)}</td>
                  <td className="text-right whitespace-nowrap">
                    {r.profit != null ? (
                      <b className={r.profit < 0 ? "text-brand-700" : "text-emerald-700"}>{baht(r.profit)}</b>
                    ) : r.sell == null && r.cost == null ? (
                      <span className="text-gray-400">-</span>
                    ) : (
                      <span className="text-xs text-amber-700">{r.missing}</span>
                    )}
                  </td>
                  <td className="text-right whitespace-nowrap text-gray-600">
                    {r.profit != null && r.sellThb ? `${((r.profit / r.sellThb) * 100).toFixed(1)}%` : "-"}
                  </td>
                  <td className="text-right whitespace-nowrap">{r.ship.sell == null ? <span className="text-gray-400">-</span> : baht(r.ship.sell)}</td>
                  <td className="text-right whitespace-nowrap">
                    {r.ship.cost != null ? baht(r.ship.cost) : r.ship.sell != null ? <span className="text-xs text-amber-700">ตู้ยังไม่ใส่ต้นทุน</span> : <span className="text-gray-400">-</span>}
                  </td>
                  <td className="text-right whitespace-nowrap">
                    {r.ship.profit == null ? <span className="text-gray-400">-</span> : <b className={r.ship.profit < 0 ? "text-brand-700" : "text-emerald-700"}>{baht(r.ship.profit)}</b>}
                  </td>
                  <td className="whitespace-nowrap"><BalanceText balance={r.balance} currency={r.o.currency} /></td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={11} className="py-6 text-center text-gray-400">ไม่มีออเดอร์ในเดือนนี้</td></tr>
              )}
            </tbody>
            {(counted.length > 0 || shipCounted.length > 0) && (
              <tfoot className="border-t-2 border-gray-300 font-semibold">
                <tr className="[&>td]:py-2 [&>td]:pr-4">
                  <td colSpan={3}>รวม (เฉพาะที่คิดกำไรได้)</td>
                  <td className="text-right whitespace-nowrap">{baht(sales)}</td>
                  <td className="text-right whitespace-nowrap">{baht(cost)}</td>
                  <td className={`text-right whitespace-nowrap ${profit < 0 ? "text-brand-700" : "text-emerald-700"}`}>{baht(profit)}</td>
                  <td className="text-right">{margin == null ? "-" : `${margin.toFixed(1)}%`}</td>
                  <td className="text-right whitespace-nowrap">{baht(shipSales)}</td>
                  <td className="text-right whitespace-nowrap">{baht(shipCost)}</td>
                  <td className={`text-right whitespace-nowrap ${shipProfit < 0 ? "text-brand-700" : "text-emerald-700"}`}>{baht(shipProfit)}</td>
                  <td />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </Card>
    </div>
  );
}
