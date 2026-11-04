import Link from "next/link";
import { desc, ilike, or } from "drizzle-orm";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { summarizeOrder } from "@/lib/orders";
import { formatThaiDateTime } from "@/lib/datetime";
import { itemStages, stageLabelsTh, type ItemStage } from "@/lib/stages";
import { BalanceText, Card, StageBadge, methodLabel } from "@/components/admin/ui";
import { formatMoney, orderBalance } from "@/lib/money";
import { SyncJjButton } from "./SyncJjButton";
import { getSyncStatus } from "@/lib/jjsync";

type Props = { searchParams: Promise<{ q?: string; stage?: string }> };

export default async function OrdersPage({ searchParams }: Props) {
  await requireUser();
  const { q = "", stage = "" } = await searchParams;
  const term = q.trim();

  const list = await db.query.orders.findMany({
    where: term
      ? or(
          ilike(orders.code, `%${term}%`),
          ilike(orders.customerName, `%${term}%`),
          ilike(orders.customerPhone, `%${term}%`),
          ilike(orders.externalId, `%${term}%`),
          ilike(orders.purchaseOrderNo, `%${term}%`),
          ilike(orders.shopName, `%${term}%`),
          ilike(orders.intlTrackingNo, `%${term}%`),
        )
      : undefined,
    orderBy: desc(orders.createdAt),
    limit: 200,
    with: { items: { with: { container: true } }, payments: { columns: { appliedAmount: true } } },
  });

  const rows = list
    .map((o) => ({ order: o, summary: summarizeOrder(o.items) }))
    .filter((r) => !stage || r.summary.stage === stage);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">ออเดอร์</h1>
        <div className="flex flex-wrap items-start gap-2">
          <SyncJjButton status={getSyncStatus()} />
          <Link href="/admin/orders/new" className="btn-primary">+ สร้างออเดอร์</Link>
        </div>
      </div>

      <Card>
        <form className="mb-4 flex flex-wrap gap-2">
          <input
            name="q"
            defaultValue={q}
            placeholder="ค้นหา เลขออเดอร์ / เลขคำสั่งซื้อ / Tracking / ร้านค้า / ชื่อ / เบอร์ / External ID"
            className="input max-w-sm flex-1"
          />
          <select name="stage" defaultValue={stage} className="input w-auto">
            <option value="">ทุกสถานะ</option>
            {itemStages.map((s) => (
              <option key={s} value={s}>{stageLabelsTh[s]}</option>
            ))}
          </select>
          <button className="rounded-lg border border-gray-300 px-4 hover:bg-gray-50">ค้นหา</button>
        </form>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-gray-500">
              <tr>
                <th className="py-2 pr-4">เลขออเดอร์</th>
                <th className="py-2 pr-4">ลูกค้า</th>
                <th className="py-2 pr-4">วิธีขนส่ง / Tracking no.</th>
                <th className="py-2 pr-4">รายการ / ตู้</th>
                <th className="py-2 pr-4">สถานะ</th>
                <th className="py-2 pr-4">ยอดเงิน</th>
                <th className="py-2 pr-4">External ID</th>
                <th className="py-2 pr-4">สร้างเมื่อ</th>
                <th className="py-2" aria-label="ลบ" />
              </tr>
            </thead>
            <tbody>
              {rows.map(({ order: o, summary: s }) => (
                <tr key={o.id} className="border-t border-gray-100">
                  <td className="py-2 pr-4">
                    <Link href={`/admin/orders/${o.id}`} className="font-semibold text-brand-600 hover:underline">{o.code}</Link>
                    {o.purchaseOrderNo && <span className="block text-xs text-gray-500">คำสั่งซื้อ {o.purchaseOrderNo}</span>}
                    {o.shopName && <span className="block text-xs text-gray-500">ร้าน {o.shopName}</span>}
                  </td>
                  <td className="py-2 pr-4">
                    {o.customerName}
                    {o.customerPhone ? (
                      <span className="block text-xs text-gray-500">{o.customerPhone}</span>
                    ) : (
                      <span className="block text-xs font-medium text-amber-700">ยังไม่มีเบอร์ (ลูกค้าเช็คสถานะไม่ได้)</span>
                    )}
                  </td>
                  <td className="py-2 pr-4">
                    {methodLabel(o.method)}
                    {o.intlTrackingNo && <span className="block text-xs text-gray-500">{o.intlTrackingNo}</span>}
                  </td>
                  <td className="py-2 pr-4">{s.itemCount} / {s.containerCount} ตู้</td>
                  <td className="py-2 pr-4">
                    <StageBadge
                      stage={s.stage as ItemStage}
                      suffix={s.deliveredCount > 0 && s.stage !== "delivered" ? ` · ส่งแล้ว ${s.deliveredCount}/${s.itemCount}` : ""}
                    />
                  </td>
                  <td className="py-2 pr-4 whitespace-nowrap">
                    {o.totalAmount != null ? (
                      <>
                        <span className="block text-xs text-gray-500">เต็ม {formatMoney(o.totalAmount, o.currency)}</span>
                        <BalanceText balance={orderBalance(o, o.payments)} currency={o.currency} />
                      </>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="py-2 pr-4 text-gray-600">{o.externalId ?? "-"}</td>
                  <td className="py-2 pr-4 text-gray-500">{formatThaiDateTime(o.createdAt)}</td>
                  <td className="py-2 text-right">
                    {/* ไอคอนใบเสนอราคา (เอกสาร) — ชี้ค้างจะขึ้นชื่อปุ่ม */}
                    <Link
                      href={`/admin/quote/${o.id}`}
                      target="_blank"
                      title="สร้างใบเสนอราคา"
                      aria-label={`สร้างใบเสนอราคา ${o.code}`}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-brand-600 hover:bg-brand-50"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="h-6 w-6">
                        <path d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8z" />
                        <path d="M14 3v5h5M9 9h1M9 13h6M9 17h6" />
                      </svg>
                    </Link>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={9} className="py-6 text-center text-gray-400">ไม่พบออเดอร์</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
