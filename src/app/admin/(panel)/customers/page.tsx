import Link from "next/link";
import { asc, count, eq, ilike, or } from "drizzle-orm";
import { db } from "@/db";
import { customers, orders } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { Card } from "@/components/admin/ui";
import { AddCustomerButton } from "./CustomerForm";

type Props = { searchParams: Promise<{ q?: string }> };

export default async function CustomersPage({ searchParams }: Props) {
  await requireUser();
  const { q = "" } = await searchParams;
  const term = q.trim();

  const list = await db
    .select({
      id: customers.id,
      code: customers.code,
      name: customers.name,
      firstName: customers.firstName,
      lastName: customers.lastName,
      phone: customers.phone,
      lineId: customers.lineId,
      address: customers.address,
      orderCount: count(orders.id),
    })
    .from(customers)
    .leftJoin(orders, eq(orders.customerId, customers.id))
    .where(
      term
        ? or(ilike(customers.code, `%${term}%`), ilike(customers.name, `%${term}%`), ilike(customers.firstName, `%${term}%`), ilike(customers.lastName, `%${term}%`), ilike(customers.phone, `%${term}%`), ilike(customers.lineId, `%${term}%`))
        : undefined,
    )
    .groupBy(customers.id)
    .orderBy(asc(customers.code));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">ลูกค้า</h1>
        <AddCustomerButton />
      </div>

      <Card title={`รายชื่อลูกค้า (${list.length})`}>
        <form className="mb-4 flex flex-wrap gap-2">
          <input name="q" defaultValue={q} placeholder="ค้นหา รหัส / ชื่อ / ชื่อจริง-นามสกุล / เบอร์ / LINE ID" className="input max-w-sm flex-1" />
          <button className="rounded-lg border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50">ค้นหา</button>
        </form>
        {list.length === 0 ? (
          <p className="text-sm text-gray-500">{term ? "ไม่พบลูกค้า" : "ยังไม่มีลูกค้า"}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-gray-500">
                <tr>
                  <th className="py-2 pr-4">รหัส</th>
                  <th className="py-2 pr-4">ชื่อ</th>
                  <th className="py-2 pr-4">ชื่อจริง - นามสกุล</th>
                  <th className="py-2 pr-4">เบอร์โทร</th>
                  <th className="py-2 pr-4">LINE ID</th>
                  <th className="py-2 pr-4">ที่อยู่</th>
                  <th className="py-2 text-right">ออเดอร์</th>
                </tr>
              </thead>
              <tbody>
                {list.map((c) => (
                  <tr key={c.id} className="border-t border-gray-100">
                    <td className="py-2 pr-4 font-mono text-gray-600">{c.code ?? "-"}</td>
                    <td className="py-2 pr-4">
                      <Link href={`/admin/customers/${c.id}`} className="font-medium text-brand-700 hover:underline">
                        {c.name}
                      </Link>
                    </td>
                    <td className="py-2 pr-4">{[c.firstName, c.lastName].filter(Boolean).join(" ") || "-"}</td>
                    <td className="py-2 pr-4">{c.phone || "-"}</td>
                    <td className="py-2 pr-4">{c.lineId ?? "-"}</td>
                    <td className="max-w-xs truncate py-2 pr-4 text-gray-600">{c.address ?? "-"}</td>
                    <td className="py-2 text-right">{c.orderCount}</td>
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
