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
import { CustomerForm } from "../CustomerForm";
import { deleteCustomer } from "../actions";

export default async function CustomerPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;
  const customer = await db.query.customers.findFirst({ where: eq(customers.id, Number(id)) });
  if (!customer) notFound();

  const list = await db.query.orders.findMany({
    where: eq(orders.customerId, customer.id),
    orderBy: desc(orders.createdAt),
    with: { items: { with: { container: true } } },
  });

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

      <Card title="ข้อมูลลูกค้า">
        <CustomerForm customer={customer} />
        <form action={deleteCustomer} className="mt-4 border-t border-gray-100 pt-4">
          <input type="hidden" name="id" value={customer.id} />
          <ConfirmButton message={`ลบลูกค้า ${customer.name}? ออเดอร์เดิมจะยังอยู่ แต่ไม่ผูกกับลูกค้านี้แล้ว`}>
            ลบลูกค้า
          </ConfirmButton>
        </form>
      </Card>

      <Card title={`ออเดอร์ของลูกค้า (${list.length})`}>
        {list.length === 0 ? (
          <p className="text-sm text-gray-500">ยังไม่มีออเดอร์</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-gray-500">
                <tr>
                  <th className="py-2 pr-4">เลขออเดอร์</th>
                  <th className="py-2 pr-4">วันที่</th>
                  <th className="py-2 pr-4">วิธีขนส่ง</th>
                  <th className="py-2 pr-4">สถานะ</th>
                  <th className="py-2">ยอดชำระ</th>
                </tr>
              </thead>
              <tbody>
                {list.map((o) => (
                  <tr key={o.id} className="border-t border-gray-100">
                    <td className="py-2 pr-4">
                      <Link href={`/admin/orders/${o.id}`} className="font-medium text-brand-700 hover:underline">{o.code}</Link>
                    </td>
                    <td className="py-2 pr-4 text-gray-600">{formatThaiDateTime(o.createdAt)}</td>
                    <td className="py-2 pr-4">{methodLabel(o.method)}</td>
                    <td className="py-2 pr-4"><StageBadge stage={summarizeOrder(o.items).stage} /></td>
                    <td className="py-2">
                      <BalanceText total={o.totalAmount} deposit={o.depositAmount} currency={o.currency} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
