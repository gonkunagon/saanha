import Link from "next/link";
import { notFound } from "next/navigation";
import { desc, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { containers, orders, type Container } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { stageOfItem, summarizeOrder, type ItemWithContainer } from "@/lib/orders";
import { formatThaiDateTime, nowLocalInputValue, toLocalInputValue } from "@/lib/datetime";
import { Card, Field, StageBadge, methodLabel } from "@/components/admin/ui";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { OrderFields } from "../OrderFields";
import {
  addItem,
  deleteItem,
  deleteOrder,
  markAllReceived,
  markOutItemsDelivered,
  markReadyItemsOutForDelivery,
  updateItem,
  updateOrder,
} from "../actions";

function ContainerSelect({ options, value }: { options: Container[]; value?: number | null }) {
  return (
    <select name="containerId" defaultValue={value ?? 0} className="input">
      <option value={0}>— ยังไม่เข้าตู้ —</option>
      {options.map((c) => (
        <option key={c.id} value={c.id}>
          {c.code} ({methodLabel(c.method)})
        </option>
      ))}
    </select>
  );
}

// ช่องข้อมูลรายการสินค้า ใช้ทั้งตอนเพิ่มและแก้ไข
function ItemFields({ item, containerOptions }: { item?: ItemWithContainer; containerOptions: Container[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Field label="สินค้า *" className="sm:col-span-2">
        <input name="description" required defaultValue={item?.description} className="input" />
      </Field>
      <Field label="จำนวน">
        <input name="quantity" type="number" min={0} defaultValue={item?.quantity ?? ""} className="input" />
      </Field>
      <Field label="เลขพัสดุจีน">
        <input name="chinaTrackingNo" defaultValue={item?.chinaTrackingNo ?? ""} className="input" />
      </Field>
      <Field label="กล่อง">
        <input name="boxes" type="number" min={0} defaultValue={item?.boxes ?? ""} className="input" />
      </Field>
      <Field label="น้ำหนัก (กก.)">
        <input name="weightKg" type="number" step="0.01" min={0} defaultValue={item?.weightKg ?? ""} className="input" />
      </Field>
      <Field label="ปริมาตร (คิว)">
        <input name="cbm" type="number" step="0.001" min={0} defaultValue={item?.cbm ?? ""} className="input" />
      </Field>
      <Field label="ตู้">
        <ContainerSelect options={containerOptions} value={item?.containerId} />
      </Field>
      <Field label="ถึงโกดังจีน">
        <input name="receivedAt" type="datetime-local" defaultValue={toLocalInputValue(item?.receivedAt ?? null)} className="input" />
      </Field>
      <Field label="ส่งออกให้ลูกค้า">
        <input name="outForDeliveryAt" type="datetime-local" defaultValue={toLocalInputValue(item?.outForDeliveryAt ?? null)} className="input" />
      </Field>
      <Field label="จัดส่งสำเร็จ">
        <input name="deliveredAt" type="datetime-local" defaultValue={toLocalInputValue(item?.deliveredAt ?? null)} className="input" />
      </Field>
      <Field label="เลขพัสดุขนส่งในไทย">
        <input name="domesticTracking" defaultValue={item?.domesticTracking ?? ""} className="input" />
      </Field>
    </div>
  );
}

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;
  const order = await db.query.orders.findFirst({
    where: eq(orders.id, Number(id)),
    with: { items: { with: { container: true } } },
  });
  if (!order) notFound();

  // ตู้ที่ยังไม่ถึงไทยเลือกได้ + ตู้ที่รายการอยู่ตอนนี้
  const openContainers = await db.query.containers.findMany({
    where: isNull(containers.arrivedAt),
    orderBy: desc(containers.createdAt),
  });
  const optionsFor = (item?: ItemWithContainer) =>
    item?.container && !openContainers.some((c) => c.id === item.container!.id)
      ? [item.container, ...openContainers]
      : openContainers;

  const summary = summarizeOrder(order.items);
  const stages = order.items.map(stageOfItem);
  const notReceived = order.items.filter((i) => !i.receivedAt).length;
  const readyToSend = stages.filter((s) => s === "thai_warehouse").length;
  const outNow = stages.filter((s) => s === "out_for_delivery").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/admin/orders" className="text-sm text-gray-500 hover:underline">← ออเดอร์ทั้งหมด</Link>
        <h1 className="text-2xl font-bold">{order.code}</h1>
        <StageBadge stage={summary.stage} />
        <span className="text-sm text-gray-500">
          {summary.itemCount} รายการ · {summary.containerCount} ตู้ · ส่งแล้ว {summary.deliveredCount}/{summary.itemCount}
        </span>
      </div>

      <Card title="อัปเดตหลายรายการพร้อมกัน">
        <div className="grid gap-4 md:grid-cols-3">
          <form action={markAllReceived} className="space-y-2 rounded-lg bg-gray-50 p-3">
            <input type="hidden" name="orderId" value={order.id} />
            <p className="text-sm font-medium">ถึงโกดังจีน ({notReceived} รายการที่ยังไม่บันทึก)</p>
            <input type="datetime-local" name="at" required defaultValue={nowLocalInputValue()} className="input py-1 text-sm" />
            <button disabled={notReceived === 0} className="btn-primary w-full py-1.5 text-sm">บันทึกทั้งหมด</button>
          </form>
          <form action={markReadyItemsOutForDelivery} className="space-y-2 rounded-lg bg-gray-50 p-3">
            <input type="hidden" name="orderId" value={order.id} />
            <p className="text-sm font-medium">ส่งออกให้ลูกค้า ({readyToSend} รายการที่ถึงโกดังไทยแล้ว)</p>
            <input type="datetime-local" name="at" required defaultValue={nowLocalInputValue()} className="input py-1 text-sm" />
            <input name="domesticTracking" placeholder="เลขพัสดุขนส่งในไทย" className="input py-1 text-sm" />
            <button disabled={readyToSend === 0} className="btn-primary w-full py-1.5 text-sm">บันทึก</button>
          </form>
          <form action={markOutItemsDelivered} className="space-y-2 rounded-lg bg-gray-50 p-3">
            <input type="hidden" name="orderId" value={order.id} />
            <p className="text-sm font-medium">จัดส่งสำเร็จ ({outNow} รายการที่กำลังจัดส่ง)</p>
            <input type="datetime-local" name="at" required defaultValue={nowLocalInputValue()} className="input py-1 text-sm" />
            <button disabled={outNow === 0} className="btn-primary w-full py-1.5 text-sm">บันทึก</button>
          </form>
        </div>
        <p className="mt-3 text-xs text-gray-500">
          สถานะช่วงปิดตู้ → ถึงโกดังไทย อัปเดตที่หน้า <Link href="/admin/containers" className="text-brand-600 hover:underline">ตู้</Link> แล้วออเดอร์จะเปลี่ยนตามเอง
        </p>
      </Card>

      <Card title={`รายการสินค้า (${order.items.length})`}>
        <div className="space-y-4">
          {order.items.map((item, idx) => (
            <form key={item.id} action={updateItem} className="rounded-lg border border-gray-200 p-4">
              <input type="hidden" name="itemId" value={item.id} />
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="font-semibold">#{idx + 1}</span>
                <StageBadge stage={stages[idx]} />
                {item.container && (
                  <Link href={`/admin/containers/${item.container.id}`} className="text-sm text-brand-600 hover:underline">
                    ตู้ {item.container.code}
                  </Link>
                )}
              </div>
              <ItemFields item={item} containerOptions={optionsFor(item)} />
              <div className="mt-3 flex items-center justify-between">
                <button className="rounded-lg border border-gray-300 px-4 py-1.5 text-sm hover:bg-gray-50">บันทึกรายการนี้</button>
                <ConfirmButton formAction={deleteItem} message={`ลบรายการ "${item.description}"?`}>ลบรายการ</ConfirmButton>
              </div>
            </form>
          ))}
          {order.items.length === 0 && <p className="text-sm text-gray-400">ยังไม่มีรายการสินค้า</p>}
        </div>
      </Card>

      <Card title="เพิ่มรายการสินค้า">
        <form action={addItem}>
          <input type="hidden" name="orderId" value={order.id} />
          <ItemFields containerOptions={openContainers} />
          <button className="btn-primary mt-4">เพิ่มรายการ</button>
        </form>
        <p className="mt-3 text-xs text-gray-500">สินค้าชิ้นเดียวกันที่แบ่งไปหลายตู้ ให้เพิ่มเป็นหลายรายการ</p>
      </Card>

      <Card title="ข้อมูลออเดอร์">
        <form action={updateOrder} className="grid gap-4 sm:grid-cols-2">
          <input type="hidden" name="id" value={order.id} />
          <OrderFields order={order} />
          <div className="flex items-center justify-between sm:col-span-2">
            <button className="btn-primary">บันทึก</button>
            <ConfirmButton formAction={deleteOrder} message={`ลบออเดอร์ ${order.code} และรายการสินค้าทั้งหมด?`}>
              ลบออเดอร์
            </ConfirmButton>
          </div>
        </form>
        <p className="mt-4 text-xs text-gray-400">
          สร้างเมื่อ {formatThaiDateTime(order.createdAt)} · แก้ไขล่าสุด {formatThaiDateTime(order.updatedAt)}
        </p>
      </Card>
    </div>
  );
}
