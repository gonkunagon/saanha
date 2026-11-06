import Link from "next/link";
import { desc } from "drizzle-orm";
import { db } from "@/db";
import { containers } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { containerStageOf } from "@/lib/orders";
import { formatThaiDateTime } from "@/lib/datetime";
import { Card, StageBadge, methodLabel } from "@/components/admin/ui";
import { CreateContainerButton } from "./CreateContainerForm";

export default async function ContainersPage() {
  await requireUser();
  const list = await db.query.containers.findMany({
    orderBy: desc(containers.createdAt),
    with: { items: { columns: { orderId: true, boxes: true } } },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">ตู้</h1>
        <CreateContainerButton />
      </div>
      <Card title={`ตู้ทั้งหมด (${list.length})`}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-gray-500">
              <tr>
                <th className="py-2 pr-4">เลขตู้</th>
                <th className="py-2 pr-4">วิธีขนส่ง</th>
                <th className="py-2 pr-4">สถานะ</th>
                <th className="py-2 pr-4">ออเดอร์ / รายการ</th>
                <th className="py-2 pr-4">บริษัทขนส่ง</th>
                <th className="py-2">อัปเดตล่าสุด</th>
              </tr>
            </thead>
            <tbody>
              {list.map((c) => {
                const stage = containerStageOf(c);
                return (
                  <tr key={c.id} className="border-t border-gray-100">
                    <td className="py-2 pr-4">
                      <Link href={`/admin/containers/${c.id}`} className="font-semibold text-brand-600 hover:underline">
                        {c.code}
                      </Link>
                    </td>
                    <td className="py-2 pr-4">{methodLabel(c.method)}</td>
                    <td className="py-2 pr-4">
                      {stage ? <StageBadge stage={stage} /> : <span className="text-gray-500">เปิดตู้ รอโหลดสินค้า</span>}
                    </td>
                    <td className="py-2 pr-4">
                      {new Set(c.items.map((i) => i.orderId)).size} / {c.items.length}
                    </td>
                    <td className="py-2 pr-4 text-gray-600">
                      {c.provider ?? "-"}
                    </td>
                    <td className="py-2 text-gray-500">{formatThaiDateTime(c.updatedAt)}</td>
                  </tr>
                );
              })}
              {list.length === 0 && (
                <tr><td colSpan={6} className="py-6 text-center text-gray-400">ยังไม่มีตู้</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
