import Link from "next/link";
import { desc } from "drizzle-orm";
import { db } from "@/db";
import { containers, orders } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { containerStageOf, summarizeOrder } from "@/lib/orders";
import { formatThaiDateTime } from "@/lib/datetime";
import { itemStages, stageLabelsTh } from "@/lib/stages";
import { Card, StageBadge, methodLabel } from "@/components/admin/ui";

export default async function DashboardPage() {
  const user = await requireUser();
  const [allOrders, allContainers] = await Promise.all([
    db.query.orders.findMany({ orderBy: desc(orders.createdAt), with: { items: { with: { container: true } } } }),
    db.query.containers.findMany({ orderBy: desc(containers.createdAt) }),
  ]);

  const summaries = allOrders.map((o) => ({ order: o, summary: summarizeOrder(o.items) }));
  const countByStage = Object.fromEntries(itemStages.map((s) => [s, 0]));
  for (const { summary } of summaries) countByStage[summary.stage]++;
  const activeContainers = allContainers.filter((c) => !c.arrivedAt);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">สวัสดี {user.name}</h1>

      <Card title="ออเดอร์ตามสถานะ">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {itemStages.map((s) => (
            <Link
              key={s}
              href={`/admin/orders?stage=${s}`}
              className="rounded-lg border border-gray-100 p-3 hover:border-brand-200 hover:bg-brand-50"
            >
              <p className="text-2xl font-bold">{countByStage[s]}</p>
              <p className="text-sm text-gray-600">{stageLabelsTh[s]}</p>
            </Link>
          ))}
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title={`ตู้ที่ยังไม่ถึงไทย (${activeContainers.length})`}>
          <ul className="divide-y divide-gray-100 text-sm">
            {activeContainers.slice(0, 8).map((c) => {
              const stage = containerStageOf(c);
              return (
                <li key={c.id} className="flex items-center justify-between py-2">
                  <Link href={`/admin/containers/${c.id}`} className="font-medium text-brand-600 hover:underline">
                    {c.code} <span className="text-gray-500">({methodLabel(c.method)})</span>
                  </Link>
                  {stage ? <StageBadge stage={stage} /> : <span className="text-gray-500">รอโหลดสินค้า</span>}
                </li>
              );
            })}
            {activeContainers.length === 0 && <li className="py-2 text-gray-400">ไม่มี</li>}
          </ul>
        </Card>

        <Card title="ออเดอร์ล่าสุด" actions={<Link href="/admin/orders/new" className="text-sm text-brand-600 hover:underline">+ สร้างออเดอร์</Link>}>
          <ul className="divide-y divide-gray-100 text-sm">
            {summaries.slice(0, 8).map(({ order: o, summary }) => (
              <li key={o.id} className="flex items-center justify-between gap-2 py-2">
                <Link href={`/admin/orders/${o.id}`} className="text-brand-600 hover:underline">
                  {o.code} <span className="text-gray-600">· {o.customerName}</span>
                </Link>
                <span className="flex items-center gap-2">
                  <StageBadge stage={summary.stage} />
                  <span className="hidden text-xs text-gray-400 sm:inline">{formatThaiDateTime(o.createdAt)}</span>
                </span>
              </li>
            ))}
            {summaries.length === 0 && <li className="py-2 text-gray-400">ยังไม่มีออเดอร์</li>}
          </ul>
        </Card>
      </div>
    </div>
  );
}
