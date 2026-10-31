import Link from "next/link";
import { notFound } from "next/navigation";
import { desc, eq, inArray, isNull, ne, and } from "drizzle-orm";
import { db } from "@/db";
import { containers, orderItems, orders } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { containerStageOf, stageOfItem, summarizeOrder, type ItemWithContainer } from "@/lib/orders";
import { formatThaiDateTime, nowLocalInputValue, toLocalInputValue } from "@/lib/datetime";
import { itemStageDates, itemStages, stageIndex, stageLabelsTh, type ItemStage } from "@/lib/stages";
import { Card, Field, StageBadge, methodLabel } from "@/components/admin/ui";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { OrderFields } from "../OrderFields";
import { addItem, deleteItem, deleteOrder, updateItem, updateOrder } from "../actions";
import { StageUpdateForm, type ContainerOption } from "./StageUpdateForm";

const STAGE_FORM = "stage-form";

// ฟอร์มแก้ไขรายละเอียดรายการ (ซ่อนไว้ กดเปิดเมื่อต้องแก้ข้อมูลผิด)
function ItemEditForm({ item, containerOptions }: { item: ItemWithContainer; containerOptions: ContainerOption[] }) {
  return (
    <form action={updateItem} className="mt-3 rounded-lg bg-gray-50 p-4">
      <input type="hidden" name="itemId" value={item.id} />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="สินค้า *" className="sm:col-span-2">
          <input name="description" required defaultValue={item.description} className="input bg-white" />
        </Field>
        <Field label="จำนวน">
          <input name="quantity" type="number" min={0} defaultValue={item.quantity ?? ""} className="input bg-white" />
        </Field>
        <Field label="เลขพัสดุจีน">
          <input name="chinaTrackingNo" defaultValue={item.chinaTrackingNo ?? ""} className="input bg-white" />
        </Field>
        <Field label="กล่อง">
          <input name="boxes" type="number" min={0} defaultValue={item.boxes ?? ""} className="input bg-white" />
        </Field>
        <Field label="น้ำหนัก (กก.)">
          <input name="weightKg" type="number" step="0.01" min={0} defaultValue={item.weightKg ?? ""} className="input bg-white" />
        </Field>
        <Field label="ปริมาตร (คิว)">
          <input name="cbm" type="number" step="0.001" min={0} defaultValue={item.cbm ?? ""} className="input bg-white" />
        </Field>
        <Field label="ตู้">
          <select name="containerCode" defaultValue={item.container?.code ?? ""} className="input bg-white">
            <option value="">— ไม่อยู่ในตู้ —</option>
            {item.container && !containerOptions.some((c) => c.code === item.container!.code) && (
              <option value={item.container.code}>{item.container.code}</option>
            )}
            {containerOptions.map((c) => (
              <option key={c.code} value={c.code}>{c.label}</option>
            ))}
          </select>
        </Field>
        <Field label="ถึงโกดังจีน">
          <input name="receivedAt" type="datetime-local" defaultValue={toLocalInputValue(item.receivedAt)} className="input bg-white" />
        </Field>
        <Field label="ส่งออกให้ลูกค้า">
          <input name="outForDeliveryAt" type="datetime-local" defaultValue={toLocalInputValue(item.outForDeliveryAt)} className="input bg-white" />
        </Field>
        <Field label="จัดส่งสำเร็จ">
          <input name="deliveredAt" type="datetime-local" defaultValue={toLocalInputValue(item.deliveredAt)} className="input bg-white" />
        </Field>
        <Field label="เลขพัสดุขนส่งในไทย">
          <input name="domesticTracking" defaultValue={item.domesticTracking ?? ""} className="input bg-white" />
        </Field>
      </div>
      <div className="mt-3 flex items-center justify-between">
        <button className="rounded-lg border border-gray-300 bg-white px-4 py-1.5 text-sm hover:bg-gray-100">บันทึกการแก้ไข</button>
        <ConfirmButton formAction={deleteItem} message={`ลบรายการ "${item.description}"?`}>ลบรายการ</ConfirmButton>
      </div>
      <p className="mt-2 text-xs text-gray-500">วันที่ปิดตู้ → ถึงโกดังไทย เป็นของตู้ แก้ได้ที่หน้าตู้</p>
    </form>
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

  // ตู้ที่ยังไม่ถึงไทย ให้เลือกในรายการตู้ (ตู้ของวิธีขนส่งเดียวกันขึ้นก่อน)
  const openContainers = await db.query.containers.findMany({
    where: isNull(containers.arrivedAt),
    orderBy: desc(containers.createdAt),
  });
  const containerOptions: ContainerOption[] = openContainers
    .sort((a, b) => Number(b.method === order.method) - Number(a.method === order.method))
    .map((c) => {
      const stage = containerStageOf(c);
      return {
        code: c.code,
        label: `${c.code} · ${methodLabel(c.method)} · ${stage ? stageLabelsTh[stage] : "รอโหลดสินค้า"}`,
      };
    });

  // ตู้ของออเดอร์นี้มีออเดอร์อื่นอยู่ด้วยกี่ออเดอร์ (เตือนก่อนอัปเดตขั้นของตู้)
  const containerIds = [...new Set(order.items.map((i) => i.containerId).filter((v): v is number => Boolean(v)))];
  const others = containerIds.length
    ? await db
        .selectDistinct({ orderId: orderItems.orderId })
        .from(orderItems)
        .where(and(inArray(orderItems.containerId, containerIds), ne(orderItems.orderId, order.id)))
    : [];
  const sharedContainerNote = others.length
    ? `ตู้ของออเดอร์นี้มีออเดอร์อื่นอีก ${others.length} ออเดอร์ สถานะของตู้ที่บันทึกจะเปลี่ยนให้ออเดอร์เหล่านั้นด้วย`
    : null;

  const summary = summarizeOrder(order.items);
  const stages = order.items.map(stageOfItem);
  // ค่าเริ่มต้นของแถบอัปเดต = ขั้นถัดไปของรายการที่ช้าที่สุด
  const nextStage: ItemStage = itemStages[Math.min(stageIndex(summary.stage) + 1, itemStages.length - 1)];

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/orders" className="text-sm text-gray-500 hover:underline">← ออเดอร์ทั้งหมด</Link>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold">{order.code}</h1>
          <StageBadge stage={summary.stage} />
        </div>
        <p className="mt-1 text-sm text-gray-600">
          {order.customerName} · {order.customerPhone} · {methodLabel(order.method)}
          {order.externalId && ` · External ID: ${order.externalId}`}
          {" · "}ส่งแล้ว {summary.deliveredCount}/{summary.itemCount}
        </p>
      </div>

      <Card title={`รายการสินค้า (${order.items.length})`}>
        {order.items.length > 0 && (
          <>
            <ul className="mb-4 divide-y divide-gray-100 rounded-lg border border-gray-200">
              {order.items.map((item, idx) => {
                const stage = stages[idx];
                const at = itemStageDates(item, item.container)[stage];
                return (
                  <li key={item.id} className="p-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <input
                        type="checkbox"
                        name="itemId"
                        value={item.id}
                        form={STAGE_FORM}
                        defaultChecked={stage !== "delivered"}
                        className="h-5 w-5 accent-brand-600"
                        aria-label={`เลือก ${item.description}`}
                      />
                      <div className="min-w-48 flex-1">
                        <p className="font-medium">
                          {item.description}
                          {item.quantity ? <span className="text-gray-500"> × {item.quantity}</span> : null}
                        </p>
                        <p className="text-xs text-gray-500">
                          {[
                            item.boxes != null && `${item.boxes} กล่อง`,
                            item.weightKg != null && `${item.weightKg} กก.`,
                            item.cbm != null && `${item.cbm} คิว`,
                            item.chinaTrackingNo && `พัสดุจีน ${item.chinaTrackingNo}`,
                          ]
                            .filter(Boolean)
                            .join(" · ") || "ยังไม่มีขนาด/น้ำหนัก"}
                        </p>
                      </div>
                      <div className="w-32 text-sm">
                        {item.container ? (
                          <Link href={`/admin/containers/${item.container.id}`} className="text-brand-600 hover:underline">
                            ตู้ {item.container.code}
                          </Link>
                        ) : (
                          <span className="text-gray-400">ยังไม่เข้าตู้</span>
                        )}
                      </div>
                      <div className="w-56 text-right">
                        <StageBadge stage={stage} />
                        <p className="mt-0.5 text-xs text-gray-500">{formatThaiDateTime(at)}</p>
                      </div>
                    </div>
                    <details className="mt-1 pl-8">
                      <summary className="cursor-pointer text-xs text-gray-500 hover:text-brand-600">แก้ไขรายละเอียด</summary>
                      <ItemEditForm item={item} containerOptions={containerOptions} />
                    </details>
                  </li>
                );
              })}
            </ul>

            <StageUpdateForm
              key={summary.stage} // บันทึกแล้ว ขยับค่าเริ่มต้นไปขั้นถัดไปเอง
              formId={STAGE_FORM}
              orderId={order.id}
              defaultStage={nextStage === "ordered" ? "china_warehouse" : nextStage}
              defaultAt={nowLocalInputValue()}
              containerOptions={containerOptions}
              sharedContainerNote={sharedContainerNote}
            />
          </>
        )}

        <form action={addItem} className="mt-6 border-t border-gray-100 pt-4">
          <input type="hidden" name="orderId" value={order.id} />
          <p className="mb-2 text-sm font-medium">+ เพิ่มรายการสินค้า</p>
          <div className="grid gap-2 sm:grid-cols-[3fr_1fr_1fr_1fr_1fr_auto]">
            <input name="description" required placeholder="ชื่อสินค้า *" className="input" />
            <input name="quantity" type="number" min={0} placeholder="จำนวน" className="input" />
            <input name="boxes" type="number" min={0} placeholder="กล่อง" className="input" />
            <input name="weightKg" type="number" step="0.01" min={0} placeholder="กก." className="input" />
            <input name="cbm" type="number" step="0.001" min={0} placeholder="คิว" className="input" />
            <button className="btn-primary">เพิ่ม</button>
          </div>
          <p className="mt-2 text-xs text-gray-500">สินค้าชิ้นเดียวกันที่แบ่งไปหลายตู้ ให้เพิ่มเป็นหลายรายการ</p>
        </form>
      </Card>

      <Card>
        <details>
          <summary className="cursor-pointer font-semibold">ข้อมูลลูกค้าและออเดอร์ (กดเพื่อแก้ไข)</summary>
          <form action={updateOrder} className="mt-4 grid gap-4 sm:grid-cols-2">
            <input type="hidden" name="id" value={order.id} />
            <OrderFields order={order} />
            <div className="flex items-center justify-between sm:col-span-2">
              <button className="btn-primary">บันทึก</button>
              <ConfirmButton formAction={deleteOrder} message={`ลบออเดอร์ ${order.code} และรายการสินค้าทั้งหมด?`}>
                ลบออเดอร์
              </ConfirmButton>
            </div>
          </form>
        </details>
        <p className="mt-3 text-xs text-gray-400">
          สร้างเมื่อ {formatThaiDateTime(order.createdAt)} · แก้ไขล่าสุด {formatThaiDateTime(order.updatedAt)}
        </p>
      </Card>
    </div>
  );
}
