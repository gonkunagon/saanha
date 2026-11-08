import Link from "next/link";
import { notFound } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { customers, orders } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { summarizeOrder } from "@/lib/orders";
import { formatThaiDateTime } from "@/lib/datetime";
import { BalanceText, Card, StageBadge, methodLabel } from "@/components/admin/ui";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { formatMoney, orderBalance, type CurrencyCode } from "@/lib/money";
import { CustomerForm } from "../CustomerForm";
import { deleteCustomer } from "../actions";

export default async function CustomerPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ edit?: string }>;
}) {
  await requireUser();
  const { id } = await params;
  // ปกติแสดงอย่างเดียว · กด "แก้ไขข้อมูล" (?edit=1) จึงแก้ได้
  const editing = (await searchParams).edit === "1";
  const customer = await db.query.customers.findFirst({ where: eq(customers.id, Number(id)) });
  if (!customer) notFound();

  const list = await db.query.orders.findMany({
    where: eq(orders.customerId, customer.id),
    orderBy: desc(orders.createdAt),
    with: { items: { with: { container: true } }, payments: { columns: { appliedAmount: true } } },
  });

  // ยอดสั่งซื้อรวม / ค้างชำระรวม แยกตามสกุลเงิน
  const byCurrency = new Map<CurrencyCode, { total: number; balance: number }>();
  for (const o of list) {
    if (o.totalAmount == null) continue;
    const t = byCurrency.get(o.currency) ?? { total: 0, balance: 0 };
    t.total += o.totalAmount;
    t.balance += Math.max(0, orderBalance(o, o.payments) ?? 0);
    byCurrency.set(o.currency, t);
  }
  const totals = [...byCurrency.entries()];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/admin/customers" className="text-sm text-gray-500 hover:underline">← ลูกค้าทั้งหมด</Link>
        <h1 className="text-2xl font-bold">{customer.name}</h1>
        {(customer.firstName || customer.lastName) && (
          <span className="text-gray-600">({[customer.firstName, customer.lastName].filter(Boolean).join(" ")})</span>
        )}
        {customer.code && <span className="rounded bg-gray-100 px-2 py-0.5 font-mono text-sm text-gray-600">{customer.code}</span>}
        <Link href={`/admin/orders/new?customer=${customer.id}`} className="btn-primary ml-auto">
          + สร้างออเดอร์ให้ลูกค้านี้
        </Link>
      </div>

      <Card
        title="ข้อมูลลูกค้า"
        actions={
          editing ? (
            <Link href={`/admin/customers/${customer.id}`} className="text-sm text-gray-500 hover:underline">ยกเลิก</Link>
          ) : (
            <Link
              href={`/admin/customers/${customer.id}?edit=1`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-brand-600 px-3 py-1.5 text-sm font-medium text-brand-600 hover:bg-brand-50"
            >
              ✏️ แก้ไขข้อมูล
            </Link>
          )
        }
      >
        {/* key: สลับโหมดแล้วให้ฟอร์มเริ่มใหม่จากข้อมูลล่าสุด */}
        <CustomerForm key={editing ? "edit" : "view"} customer={customer} locked={!editing} doneHref={`/admin/customers/${customer.id}`} />
        {editing && (
          <form action={deleteCustomer} className="mt-4 border-t border-gray-100 pt-4">
            <input type="hidden" name="id" value={customer.id} />
            <ConfirmButton message={`ลบลูกค้า ${customer.name}? ออเดอร์เดิมจะยังอยู่ แต่ไม่ผูกกับลูกค้านี้แล้ว`}>
              ลบลูกค้า
            </ConfirmButton>
          </form>
        )}
      </Card>

      <Card title="ประวัติการสั่งซื้อ">
        {list.length === 0 ? (
          <p className="text-sm text-gray-500">ยังไม่มีประวัติการสั่งซื้อ</p>
        ) : (
          <>
            {/* สรุปภาพรวมของลูกค้า (ยอดแยกตามสกุลเงิน เพราะรวมหยวนกับบาทไม่ได้) */}
            <dl className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-lg bg-gray-50 px-4 py-3">
                <dt className="text-xs text-gray-500">ออเดอร์ทั้งหมด</dt>
                <dd className="text-xl font-semibold">{list.length}</dd>
              </div>
              <div className="rounded-lg bg-gray-50 px-4 py-3">
                <dt className="text-xs text-gray-500">รายการสินค้าทั้งหมด</dt>
                <dd className="text-xl font-semibold">{list.reduce((n, o) => n + o.items.length, 0)}</dd>
              </div>
              <div className="rounded-lg bg-gray-50 px-4 py-3">
                <dt className="text-xs text-gray-500">ยอดสั่งซื้อรวม</dt>
                <dd className="font-semibold">
                  {totals.length ? totals.map(([cur, t]) => <span key={cur} className="block">{formatMoney(t.total, cur)}</span>) : "-"}
                </dd>
              </div>
              <div className="rounded-lg bg-gray-50 px-4 py-3">
                <dt className="text-xs text-gray-500">ค้างชำระรวม</dt>
                <dd className="font-semibold text-brand-700">
                  {totals.some(([, t]) => t.balance > 0)
                    ? totals.filter(([, t]) => t.balance > 0).map(([cur, t]) => <span key={cur} className="block">{formatMoney(t.balance, cur)}</span>)
                    : <span className="text-emerald-700">ไม่มียอดค้าง</span>}
                </dd>
              </div>
            </dl>

            {/* ไล่ตามวันที่ ล่าสุดก่อน: ออเดอร์ + สินค้าในออเดอร์ */}
            <ol className="space-y-3">
              {list.map((o) => (
                <li key={o.id} className="rounded-lg border border-gray-200">
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-gray-100 bg-gray-50 px-4 py-2.5 text-sm">
                    <Link href={`/admin/orders/${o.id}`} className="font-semibold text-brand-700 hover:underline">{o.code}</Link>
                    <span className="text-gray-500">{formatThaiDateTime(o.createdAt)}</span>
                    {o.shopName && <span className="text-gray-600">ร้าน {o.shopName}</span>}
                    <span className="text-gray-600">{methodLabel(o.method)}</span>
                    <StageBadge stage={summarizeOrder(o.items).stage} />
                    <span className="ml-auto flex items-center gap-4">
                      {o.totalAmount != null && <span className="font-medium">{formatMoney(o.totalAmount, o.currency)}</span>}
                      <BalanceText balance={orderBalance(o, o.payments)} currency={o.currency} />
                      <Link href={`/admin/quote/${o.id}`} target="_blank" className="text-xs text-brand-700 hover:underline">ใบเสนอราคา</Link>
                    </span>
                  </div>
                  <ul className="divide-y divide-gray-50 px-4 text-sm">
                    {o.items.map((i) => (
                      <li key={i.id} className="flex flex-wrap items-center gap-x-4 py-2">
                        <span className="flex-1">
                          {i.description}
                          {i.productUrl && (
                            <a href={i.productUrl} target="_blank" rel="noopener noreferrer" className="ml-2 text-xs text-brand-700 hover:underline">🔗 ลิงก์สินค้า</a>
                          )}
                        </span>
                        <span className="w-20 text-right text-gray-600">{i.quantity != null ? `× ${i.quantity}` : "-"}</span>
                        <span className="w-36 text-right text-gray-600">{i.unitPrice != null ? `@ ${formatMoney(i.unitPrice, o.currency)}` : ""}</span>
                        {/* สถานะรายการ: ส่งถึงลูกค้าแล้ว = สำเร็จ · ที่เหลือ = อยู่ระหว่างดำเนินการ */}
                        {i.deliveredAt ? (
                          <span className="w-40 text-right text-xs font-medium text-emerald-700">✓ สำเร็จ</span>
                        ) : (
                          <span className="w-40 text-right text-xs text-amber-700">อยู่ระหว่างดำเนินการ</span>
                        )}
                      </li>
                    ))}
                    {o.items.length === 0 && <li className="py-2 text-gray-400">ไม่มีรายการสินค้า</li>}
                  </ul>
                </li>
              ))}
            </ol>
          </>
        )}
      </Card>
    </div>
  );
}
