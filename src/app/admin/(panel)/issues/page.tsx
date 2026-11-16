import Link from "next/link";
import { desc, eq, ne } from "drizzle-orm";
import { db } from "@/db";
import { itemIssues, orderItems, orders } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { Card } from "@/components/admin/ui";
import { formatMoney } from "@/lib/money";
import { issueFoundAtLabels, issueKindLabels, issueNetLoss, issueResponsibleLabels, issueStatusClass, issueStatusLabels } from "@/lib/issues";

type Props = { searchParams: Promise<{ all?: string }> };

// รวมปัญหาสินค้า (เสียหาย / สูญหาย / ส่งผิด) ทุกออเดอร์ — ค่าเริ่มต้น = เรื่องที่ยังไม่ปิด (ไว้ตามเคลม)
export default async function IssuesPage({ searchParams }: Props) {
  await requireUser();
  const all = (await searchParams).all === "1";
  const rows = await db
    .select({ issue: itemIssues, code: orders.code, customer: orders.customerName, item: orderItems.description })
    .from(itemIssues)
    .innerJoin(orders, eq(orders.id, itemIssues.orderId))
    .innerJoin(orderItems, eq(orderItems.id, itemIssues.itemId))
    .where(all ? undefined : ne(itemIssues.status, "closed"))
    .orderBy(desc(itemIssues.createdAt));

  const comp = rows.reduce((s, r) => s + (r.issue.compensation ?? 0), 0);
  const rec = rows.reduce((s, r) => s + (r.issue.recovered ?? 0), 0);
  const tab = (on: boolean) => `rounded-lg px-3 py-1.5 text-sm ${on ? "bg-brand-600 text-white" : "text-gray-600 hover:bg-gray-100"}`;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">ปัญหาสินค้า</h1>
      <Card
        title={all ? `ทั้งหมด (${rows.length})` : `ยังไม่ปิดเรื่อง (${rows.length})`}
        actions={
          <div className="flex gap-1">
            <Link href="/admin/issues" className={tab(!all)}>ยังไม่ปิดเรื่อง</Link>
            <Link href="/admin/issues?all=1" className={tab(all)}>ทั้งหมด</Link>
          </div>
        }
      >
        {rows.length === 0 ? (
          <p className="text-sm text-gray-500">
            ไม่มีเรื่องค้าง — แจ้งปัญหาสินค้าได้ที่หน้าออเดอร์ (ปุ่ม &quot;⚠️ แจ้งปัญหาสินค้า&quot; ใต้รายการสินค้า)
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-max text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-xs text-gray-500">
                  <th className="py-2 pr-3 font-normal">ออเดอร์</th>
                  <th className="px-2 py-2 font-normal">สินค้า</th>
                  <th className="px-2 py-2 font-normal">ประเภท</th>
                  <th className="px-2 py-2 text-right font-normal">กล่อง</th>
                  <th className="px-2 py-2 font-normal">พบที่ / รับผิดชอบ</th>
                  <th className="px-2 py-2 text-right font-normal">ชดเชยลูกค้า</th>
                  <th className="px-2 py-2 text-right font-normal">เคลมคืนได้</th>
                  <th className="px-2 py-2 text-right font-normal">ร้านเสียจริง</th>
                  <th className="py-2 pl-2 font-normal">สถานะ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map(({ issue: i, code, customer, item }) => {
                  const loss = issueNetLoss(i);
                  return (
                    <tr key={i.id} className="align-top">
                      <td className="py-2 pr-3">
                        <Link href={`/admin/orders/${i.orderId}`} className="font-medium text-brand-700 hover:underline">{code}</Link>
                        <p className="text-xs text-gray-500">{customer}</p>
                      </td>
                      <td className="max-w-56 px-2 py-2">
                        {item}
                        {i.note && <p className="text-xs whitespace-pre-line text-gray-500">{i.note}</p>}
                      </td>
                      <td className="px-2 py-2">{issueKindLabels[i.kind]}</td>
                      <td className="px-2 py-2 text-right">{i.boxes ?? "-"}</td>
                      <td className="px-2 py-2 text-xs text-gray-600">
                        {i.foundAt ? issueFoundAtLabels[i.foundAt] : "-"}
                        <br />
                        {issueResponsibleLabels[i.responsible]}
                      </td>
                      <td className="px-2 py-2 text-right">{i.compensation != null ? formatMoney(i.compensation, "THB") : "-"}</td>
                      <td className="px-2 py-2 text-right">{i.recovered != null ? formatMoney(i.recovered, "THB") : "-"}</td>
                      <td className={`px-2 py-2 text-right font-medium ${loss > 0 ? "text-brand-700" : "text-gray-600"}`}>{formatMoney(loss, "THB")}</td>
                      <td className="py-2 pl-2">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ring-1 ${issueStatusClass[i.status]}`}>{issueStatusLabels[i.status]}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-200 font-semibold">
                  <td colSpan={5} className="py-2 pr-3 text-gray-600">รวม</td>
                  <td className="px-2 py-2 text-right">{formatMoney(comp, "THB")}</td>
                  <td className="px-2 py-2 text-right">{formatMoney(rec, "THB")}</td>
                  <td className="px-2 py-2 text-right text-brand-700">{formatMoney(issueNetLoss({ compensation: comp, recovered: rec }), "THB")}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
