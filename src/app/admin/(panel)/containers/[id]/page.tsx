import Link from "next/link";
import { notFound } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { containers, orders } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { containerStageOf, summarizeOrder } from "@/lib/orders";
import { formatThaiDateTime, nowLocalInputValue } from "@/lib/datetime";
import { containerStageFields, containerStages, stageLabelsTh, type ItemStage } from "@/lib/stages";
import { Card, Field, MethodSelect, StageBadge, methodLabel } from "@/components/admin/ui";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { CheckIcon } from "@/components/icons";
import { DEFAULT_SHIPPING_RATE_PER_CBM } from "@/config/rates";
import { ShippingRateForm } from "./ShippingRateForm";
import { shippingCostOf } from "@/lib/shipping";
import {
  addOrdersToContainer,
  deleteContainer,
  removeOrderFromContainer,
  setContainerStage,
  setContainerStatus,
  updateContainer,
} from "../actions";

const sum = (values: (number | null)[]) => values.reduce<number>((a, v) => a + (v ?? 0), 0);
const shippingOf = shippingCostOf;
const baht = (n: number) => n.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// สถานะที่อัปเดตจากหน้าตู้ได้: ขั้นของตู้ 4 ขั้น + ส่งต่อให้ลูกค้า (ใส่ให้ทุกรายการในตู้)
const statusOptions: ItemStage[] = [...containerStages, "out_for_delivery", "delivered"];

export default async function ContainerPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;
  const container = await db.query.containers.findFirst({
    where: eq(containers.id, Number(id)),
    with: { items: { with: { order: true } } },
  });
  if (!container) notFound();

  const stage = containerStageOf(container);
  const items = container.items;

  // ออเดอร์ในตู้ (1 ออเดอร์อาจมีหลายรายการในตู้นี้)
  const inside = [...new Map(items.map((i) => [i.orderId, i.order])).values()].map((order) => {
    const own = items.filter((i) => i.orderId === order.id).map((i) => ({ ...i, container }));
    return { order, items: own, summary: summarizeOrder(own) };
  });

  // ออเดอร์ที่ยังมีรายการไม่อยู่ตู้ไหนและยังไม่ส่งถึงลูกค้า → เลือกเพิ่มเข้าตู้นี้ได้
  const candidates = (
    await db.query.orders.findMany({ orderBy: desc(orders.createdAt), with: { items: { with: { container: true } } } })
  )
    .map((o) => ({ order: o, free: o.items.filter((i) => !i.containerId && !i.deliveredAt), summary: summarizeOrder(o.items) }))
    .filter((o) => o.free.length > 0);

  // ค่าเริ่มต้นของสถานะ = ขั้นถัดไปของตู้
  const nextStatus =
    statusOptions[Math.min(stage ? statusOptions.indexOf(stage) + 1 : 0, statusOptions.length - 1)] ?? statusOptions[0];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/admin/containers" className="text-sm text-gray-500 hover:underline">← ตู้ทั้งหมด</Link>
        <h1 className="text-2xl font-bold">ตู้ {container.code}</h1>
        {stage ? <StageBadge stage={stage} /> : <span className="text-sm text-gray-500">เปิดตู้ รอโหลดสินค้า</span>}
        <span className="text-sm text-gray-500">· {methodLabel(container.method)} · {inside.length} ออเดอร์</span>
        {/* ลบได้เฉพาะตู้ว่าง กันลบผิดแล้วออเดอร์หลุดจากตู้ */}
        <span className="ml-auto">
          {items.length === 0 ? (
            <form action={deleteContainer}>
              <input type="hidden" name="id" value={container.id} />
              <ConfirmButton
                message={`ลบตู้ ${container.code}? ลบแล้วกู้คืนไม่ได้`}
                className="rounded-lg border border-brand-600 px-4 py-2 text-sm font-medium text-brand-600 hover:bg-brand-50"
              >
                ลบตู้
              </ConfirmButton>
            </form>
          ) : (
            <span
              title="ตู้ที่มีออเดอร์อยู่ลบไม่ได้"
              className="cursor-not-allowed rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-400"
            >
              ลบตู้ (เอาออเดอร์ออกจากตู้ก่อน)
            </span>
          )}
        </span>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="อัปเดตสถานะตู้">
          <form
            key={nextStatus} // บันทึกแล้ว ขยับค่าเริ่มต้นไปขั้นถัดไปเอง
            action={setContainerStatus}
            className="rounded-lg bg-brand-50 p-4 ring-1 ring-brand-100"
          >
            <input type="hidden" name="id" value={container.id} />
            <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
              <Field label="สถานะใหม่">
                <select name="stage" defaultValue={nextStatus} className="input bg-white">
                  {statusOptions.map((s) => (
                    <option key={s} value={s}>
                      {stageLabelsTh[s]}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="วันเวลา">
                <input type="datetime-local" name="at" required defaultValue={nowLocalInputValue()} className="input bg-white" />
              </Field>
            </div>
            <button disabled={inside.length === 0} className="btn-primary mt-3 w-full disabled:opacity-50">
              บันทึกสถานะ ({inside.length} ออเดอร์ในตู้เปลี่ยนตาม)
            </button>
            {inside.length === 0 && <p className="mt-2 text-xs text-gray-500">เพิ่มออเดอร์เข้าตู้ก่อน (ด้านล่าง)</p>}
          </form>

          <ol className="mt-5 space-y-3">
            {containerStages.map((s) => {
              const at = container[containerStageFields[s]];
              return (
                <li key={s} className="flex items-center gap-3">
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                      at ? "bg-brand-600 text-white" : "border-2 border-gray-200"
                    }`}
                  >
                    {at && <CheckIcon className="h-3.5 w-3.5" />}
                  </span>
                  <div className="flex-1">
                    <p className={`text-sm font-medium ${at ? "" : "text-gray-400"}`}>{stageLabelsTh[s]}</p>
                    {at && <p className="text-xs text-gray-500">{formatThaiDateTime(at)}</p>}
                  </div>
                  {at && (
                    <form action={setContainerStage}>
                      <input type="hidden" name="id" value={container.id} />
                      <input type="hidden" name="stage" value={s} />
                      <input type="hidden" name="clear" value="1" />
                      <ConfirmButton
                        message={`ล้างวันที่ "${stageLabelsTh[s]}" ของตู้นี้?`}
                        className="text-xs text-gray-400 hover:text-brand-600 hover:underline"
                      >
                        ล้าง
                      </ConfirmButton>
                    </form>
                  )}
                </li>
              );
            })}
          </ol>
          <p className="mt-4 text-xs text-gray-500">
            &quot;กำลังจัดส่ง&quot; / &quot;จัดส่งสำเร็จ&quot; จะใส่ให้ทุกรายการในตู้ที่ยังไม่มีวันที่ — ถ้าส่งลูกค้าไม่พร้อมกัน
            ให้อัปเดตทีละออเดอร์ในหน้าออเดอร์แทน
          </p>
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
            <Field label="หมายเหตุภายใน" className="sm:col-span-2">
              <textarea name="note" rows={2} defaultValue={container.note ?? ""} className="input" />
            </Field>
            <div className="sm:col-span-2">
              <button className="btn-primary">บันทึก</button>
            </div>
          </form>
          <dl className="mt-5 grid grid-cols-3 gap-3 border-t border-gray-100 pt-4 text-sm">
            <div><dt className="text-gray-500">กล่องรวม</dt><dd className="font-semibold">{sum(items.map((i) => i.boxes))}</dd></div>
            <div><dt className="text-gray-500">น้ำหนักรวม (กก.)</dt><dd className="font-semibold">{sum(items.map((i) => i.weightKg)).toFixed(2)}</dd></div>
            <div><dt className="text-gray-500">ปริมาตรรวม (คิว)</dt><dd className="font-semibold">{sum(items.map((i) => i.cbm)).toFixed(3)}</dd></div>
          </dl>
        </Card>
      </div>

      <Card title={`ออเดอร์ในตู้ (${inside.length})`}>
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
                <th className="py-2 pr-4">สถานะ</th>
                <th className="py-2 pr-4 whitespace-nowrap">เรท (บาท / คิว)</th>
                <th className="py-2 pr-4 text-right whitespace-nowrap">ค่าขนส่ง (บาท)</th>
                <th className="py-2 pr-4 text-center whitespace-nowrap">ใบสรุปค่าขนส่ง</th>
                <th className="py-2" />
              </tr>
            </thead>
            <tbody>
              {inside.map(({ order, items: own, summary }) => (
                <tr key={order.id} className="border-t border-gray-100 align-top">
                  <td className="py-2 pr-4">
                    <Link href={`/admin/orders/${order.id}`} className="font-medium text-brand-600 hover:underline">{order.code}</Link>
                  </td>
                  <td className="py-2 pr-4">{order.customerName}</td>
                  <td className="py-2 pr-4">
                    {own.map((i) => (
                      <span key={i.id} className="block">{i.description}{i.quantity ? ` × ${i.quantity}` : ""}</span>
                    ))}
                  </td>
                  <td className="py-2 pr-4">{sum(own.map((i) => i.boxes)) || "-"}</td>
                  <td className="py-2 pr-4">{sum(own.map((i) => i.weightKg)) || "-"}</td>
                  <td className="py-2 pr-4">{sum(own.map((i) => i.cbm)) || "-"}</td>
                  <td className="py-2 pr-4"><StageBadge stage={summary.stage} /></td>
                  <td className="py-2 pr-4">
                    <ShippingRateForm orderId={order.id} rate={order.shippingRate} defaultRate={DEFAULT_SHIPPING_RATE_PER_CBM} />
                  </td>
                  <td className="py-2 pr-4 text-right font-medium whitespace-nowrap">{baht(shippingOf(own, order.shippingRate))}</td>
                  <td className="py-1 pr-4 text-center">
                    {/* ใบสรุปค่าขนส่ง A4 ของออเดอร์นี้ในตู้นี้ (ส่ง / พิมพ์ให้ลูกค้า) */}
                    <Link
                      href={`/admin/shipping/${container.id}/${order.id}`}
                      target="_blank"
                      title="ใบสรุปค่าขนส่ง"
                      aria-label={`ใบสรุปค่าขนส่ง ${order.code}`}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-brand-600 hover:bg-brand-50"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="h-5 w-5">
                        <path d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8z" />
                        <path d="M14 3v5h5M9 9h1M9 13h6M9 17h6" />
                      </svg>
                    </Link>
                  </td>
                  <td className="py-2 text-right">
                    <form action={removeOrderFromContainer}>
                      <input type="hidden" name="id" value={container.id} />
                      <input type="hidden" name="orderId" value={order.id} />
                      <ConfirmButton
                        message={`เอาออเดอร์ ${order.code} ออกจากตู้ ${container.code}?`}
                        className="text-sm whitespace-nowrap text-gray-500 hover:text-brand-600 hover:underline"
                      >
                        เอาออกจากตู้
                      </ConfirmButton>
                    </form>
                  </td>
                </tr>
              ))}
              {inside.length === 0 && (
                <tr><td colSpan={11} className="py-6 text-center text-gray-400">ยังไม่มีออเดอร์ในตู้ — เลือกจากรายการด้านล่าง</td></tr>
              )}
            </tbody>
            {inside.length > 0 && (
              <tfoot>
                {/* สรุปค่าขนส่งทั้งตู้ */}
                <tr className="border-t-2 border-gray-200 font-semibold">
                  <td className="py-2 pr-4" colSpan={3}>รวมทั้งตู้</td>
                  <td className="py-2 pr-4">{sum(inside.flatMap((r) => r.items.map((i) => i.boxes))) || "-"}</td>
                  <td className="py-2 pr-4">{Math.round(sum(inside.flatMap((r) => r.items.map((i) => i.weightKg))) * 100) / 100 || "-"}</td>
                  <td className="py-2 pr-4">{Math.round(sum(inside.flatMap((r) => r.items.map((i) => i.cbm))) * 10000) / 10000 || "-"}</td>
                  <td className="py-2 pr-4" colSpan={2} />
                  <td className="py-2 pr-4 text-right whitespace-nowrap text-brand-700">
                    {baht(sum(inside.map((r) => shippingOf(r.items, r.order.shippingRate))))}
                  </td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </Card>

      <Card title={`เพิ่มออเดอร์เข้าตู้ (${candidates.length} ออเดอร์ยังไม่เข้าตู้)`}>
        {candidates.length === 0 ? (
          <p className="text-sm text-gray-400">ทุกออเดอร์อยู่ในตู้แล้ว</p>
        ) : (
          <form action={addOrdersToContainer}>
            <input type="hidden" name="id" value={container.id} />
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-gray-500">
                  <tr>
                    <th className="py-2 pr-2" />
                    <th className="py-2 pr-4">ออเดอร์</th>
                    <th className="py-2 pr-4">ลูกค้า</th>
                    <th className="py-2 pr-4">สินค้าที่ยังไม่เข้าตู้</th>
                    <th className="py-2 pr-4">วิธีขนส่ง</th>
                    <th className="py-2">สถานะ</th>
                  </tr>
                </thead>
                <tbody>
                  {candidates.map(({ order, free, summary }) => (
                    <tr key={order.id} className="border-t border-gray-100 align-top">
                      <td className="py-2 pr-2">
                        <input type="checkbox" name="orderId" value={order.id} className="h-4 w-4 accent-brand-600" aria-label={`เลือก ${order.code}`} />
                      </td>
                      <td className="py-2 pr-4 font-medium">{order.code}</td>
                      <td className="py-2 pr-4">{order.customerName}</td>
                      <td className="py-2 pr-4">
                        {free.map((i) => (
                          <span key={i.id} className="block">{i.description}{i.boxes ? ` · ${i.boxes} กล่อง` : ""}</span>
                        ))}
                      </td>
                      <td className={`py-2 pr-4 ${order.method !== container.method ? "font-medium text-amber-700" : ""}`}>
                        {methodLabel(order.method)}
                        {order.method !== container.method && " ⚠️"}
                      </td>
                      <td className="py-2"><StageBadge stage={summary.stage} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button className="btn-primary mt-4">เพิ่มออเดอร์ที่เลือกเข้าตู้</button>
            <p className="mt-2 text-xs text-gray-500">⚠️ = วิธีขนส่งของออเดอร์ไม่ตรงกับตู้</p>
          </form>
        )}
      </Card>
    </div>
  );
}
