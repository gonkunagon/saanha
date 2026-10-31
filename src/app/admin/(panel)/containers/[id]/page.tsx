import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq, isNotNull, isNull } from "drizzle-orm";
import { db } from "@/db";
import { containers, orderItems } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { containerStageOf } from "@/lib/orders";
import { formatThaiDateTime, nowLocalInputValue, toLocalInputValue } from "@/lib/datetime";
import { containerStageFields, containerStages, stageLabelsTh } from "@/lib/stages";
import { Card, Field, MethodSelect, StageBadge, methodLabel } from "@/components/admin/ui";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { CheckIcon } from "@/components/icons";
import {
  addItemsToContainer,
  deleteContainer,
  removeItemFromContainer,
  setContainerStage,
  updateContainer,
} from "../actions";

const sum = (values: (number | null)[]) => values.reduce<number>((a, v) => a + (v ?? 0), 0);

export default async function ContainerPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;
  const container = await db.query.containers.findFirst({
    where: eq(containers.id, Number(id)),
    with: { items: { with: { order: true } } },
  });
  if (!container) notFound();

  // รายการที่ถึงโกดังจีนแล้วแต่ยังไม่ได้เข้าตู้ใด
  const waiting = await db.query.orderItems.findMany({
    where: and(isNull(orderItems.containerId), isNotNull(orderItems.receivedAt)),
    with: { order: true },
  });
  const stage = containerStageOf(container);
  const items = container.items;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/admin/containers" className="text-sm text-gray-500 hover:underline">← ตู้ทั้งหมด</Link>
        <h1 className="text-2xl font-bold">ตู้ {container.code}</h1>
        {stage ? <StageBadge stage={stage} /> : <span className="text-sm text-gray-500">เปิดตู้ รอโหลดสินค้า</span>}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="อัปเดตสถานะตู้">
          <p className="mb-4 text-sm text-gray-500">
            อัปเดตแล้ว ทุกออเดอร์ในตู้นี้ ({new Set(items.map((i) => i.orderId)).size} ออเดอร์) จะเปลี่ยนสถานะตามอัตโนมัติ
          </p>
          <ol className="space-y-4">
            {containerStages.map((s) => {
              const at = container[containerStageFields[s]];
              return (
                <li key={s} className="flex gap-3">
                  <span
                    className={`mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                      at ? "bg-brand-600 text-white" : "border-2 border-gray-200 text-gray-300"
                    }`}
                  >
                    {at && <CheckIcon className="h-4 w-4" />}
                  </span>
                  <div className="flex-1">
                    <p className="font-medium">{stageLabelsTh[s]}</p>
                    <p className="text-sm text-gray-500">{at ? formatThaiDateTime(at) : "ยังไม่ถึงขั้นนี้"}</p>
                    <form action={setContainerStage} className="mt-2 flex flex-wrap gap-2">
                      <input type="hidden" name="id" value={container.id} />
                      <input type="hidden" name="stage" value={s} />
                      <input
                        type="datetime-local"
                        name="at"
                        required
                        defaultValue={at ? toLocalInputValue(at) : nowLocalInputValue()}
                        className="input w-auto py-1 text-sm"
                      />
                      <button className="rounded bg-brand-600 px-3 py-1 text-sm text-white hover:bg-brand-700">
                        {at ? "แก้วันที่" : "บันทึก"}
                      </button>
                      {at && (
                        <button name="clear" value="1" formNoValidate className="px-2 text-sm text-gray-500 hover:underline">
                          ล้าง
                        </button>
                      )}
                    </form>
                  </div>
                </li>
              );
            })}
          </ol>
        </Card>

        <Card title="ข้อมูลตู้">
          <form action={updateContainer} className="grid gap-3 sm:grid-cols-2">
            <input type="hidden" name="id" value={container.id} />
            <Field label="เลขตู้">
              <input name="code" required defaultValue={container.code} className="input uppercase" />
            </Field>
            <Field label="วิธีขนส่ง">
              <MethodSelect defaultValue={container.method} />
            </Field>
            <Field label="บริษัทขนส่ง">
              <input name="provider" defaultValue={container.provider ?? ""} className="input" />
            </Field>
            <Field label="External ID (เลขอ้างอิงของบริษัทขนส่ง)">
              <input name="externalId" defaultValue={container.externalId ?? ""} className="input" />
            </Field>
            <Field label="หมายเหตุภายใน" className="sm:col-span-2">
              <textarea name="note" rows={2} defaultValue={container.note ?? ""} className="input" />
            </Field>
            <div className="flex items-center justify-between sm:col-span-2">
              <button className="btn-primary">บันทึก</button>
              {items.length === 0 && (
                <ConfirmButton formAction={deleteContainer} message={`ลบตู้ ${container.code}?`}>ลบตู้</ConfirmButton>
              )}
            </div>
          </form>
          <dl className="mt-5 grid grid-cols-3 gap-3 border-t border-gray-100 pt-4 text-sm">
            <div><dt className="text-gray-500">กล่องรวม</dt><dd className="font-semibold">{sum(items.map((i) => i.boxes))}</dd></div>
            <div><dt className="text-gray-500">น้ำหนักรวม (กก.)</dt><dd className="font-semibold">{sum(items.map((i) => i.weightKg)).toFixed(2)}</dd></div>
            <div><dt className="text-gray-500">ปริมาตรรวม (คิว)</dt><dd className="font-semibold">{sum(items.map((i) => i.cbm)).toFixed(3)}</dd></div>
          </dl>
        </Card>
      </div>

      <Card title={`สินค้าในตู้ (${items.length} รายการ)`}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-gray-500">
              <tr>
                <th className="py-2 pr-4">ออเดอร์</th>
                <th className="py-2 pr-4">ลูกค้า</th>
                <th className="py-2 pr-4">สินค้า</th>
                <th className="py-2 pr-4">กล่อง</th>
                <th className="py-2 pr-4">กก.</th>
                <th className="py-2 pr-4">คิว</th>
                <th className="py-2" />
              </tr>
            </thead>
            <tbody>
              {items.map((i) => (
                <tr key={i.id} className="border-t border-gray-100">
                  <td className="py-2 pr-4">
                    <Link href={`/admin/orders/${i.orderId}`} className="text-brand-600 hover:underline">{i.order.code}</Link>
                  </td>
                  <td className="py-2 pr-4">{i.order.customerName}</td>
                  <td className="py-2 pr-4">{i.description}{i.quantity ? ` × ${i.quantity}` : ""}</td>
                  <td className="py-2 pr-4">{i.boxes ?? "-"}</td>
                  <td className="py-2 pr-4">{i.weightKg ?? "-"}</td>
                  <td className="py-2 pr-4">{i.cbm ?? "-"}</td>
                  <td className="py-2 text-right">
                    <form action={removeItemFromContainer}>
                      <input type="hidden" name="itemId" value={i.id} />
                      <button className="text-sm text-gray-500 hover:text-brand-600 hover:underline">เอาออกจากตู้</button>
                    </form>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr><td colSpan={7} className="py-6 text-center text-gray-400">ยังไม่มีสินค้าในตู้ — เลือกจากรายการด้านล่าง</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title={`สินค้าที่ถึงโกดังจีนแล้ว รอเข้าตู้ (${waiting.length})`}>
        {waiting.length === 0 ? (
          <p className="text-sm text-gray-400">ไม่มีสินค้ารอเข้าตู้ (ต้องบันทึกวันที่ "ถึงโกดังจีน" ในหน้าออเดอร์ก่อน)</p>
        ) : (
          <form action={addItemsToContainer}>
            <input type="hidden" name="id" value={container.id} />
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-gray-500">
                  <tr>
                    <th className="py-2 pr-2" />
                    <th className="py-2 pr-4">ออเดอร์</th>
                    <th className="py-2 pr-4">ลูกค้า</th>
                    <th className="py-2 pr-4">สินค้า</th>
                    <th className="py-2 pr-4">วิธีขนส่ง</th>
                    <th className="py-2 pr-4">กล่อง</th>
                    <th className="py-2">ถึงโกดังจีน</th>
                  </tr>
                </thead>
                <tbody>
                  {waiting.map((i) => (
                    <tr key={i.id} className="border-t border-gray-100">
                      <td className="py-2 pr-2">
                        <input type="checkbox" name="itemId" value={i.id} className="h-4 w-4 accent-brand-600" />
                      </td>
                      <td className="py-2 pr-4">{i.order.code}</td>
                      <td className="py-2 pr-4">{i.order.customerName}</td>
                      <td className="py-2 pr-4">{i.description}</td>
                      <td className={`py-2 pr-4 ${i.order.method !== container.method ? "text-amber-700" : ""}`}>
                        {methodLabel(i.order.method)}
                      </td>
                      <td className="py-2 pr-4">{i.boxes ?? "-"}</td>
                      <td className="py-2 text-gray-500">{formatThaiDateTime(i.receivedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button className="btn-primary mt-4">เพิ่มรายการที่เลือกเข้าตู้</button>
          </form>
        )}
      </Card>
    </div>
  );
}
