import Link from "next/link";
import { notFound } from "next/navigation";
import { desc, eq, inArray, isNull, ne, and } from "drizzle-orm";
import { db } from "@/db";
import { containers, orderItems, orders } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { containerStageOf, stageOfItem, summarizeOrder, type ItemWithContainer } from "@/lib/orders";
import { formatThaiDateTime, nowLocalInputValue, toLocalInputValue } from "@/lib/datetime";
import { itemStageDates, itemStages, optionalStages, stageIndex, stageLabelsTh, type ItemStage } from "@/lib/stages";
import { Card, Field, StageBadge, methodLabel } from "@/components/admin/ui";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { OrderFields } from "../OrderFields";
import { listCustomersForPicker } from "@/lib/customers";
import { addItem, deleteItem, updateItem, updateItemPrice, updateOrder } from "../actions";
import { DeleteOrderButton } from "@/components/admin/DeleteOrderButton";
import { BalanceText } from "@/components/admin/ui";
import { currencyLabel, formatMoney, handlingFeeOf, type CurrencyCode } from "@/lib/money";
import { StageUpdateForm, type ContainerOption } from "./StageUpdateForm";
import { PackageFields } from "@/components/admin/PackageFields";
import type { ItemPackage } from "@/db/schema";

const STAGE_FORM = "stage-form";

// ฟอร์มแก้ไขรายละเอียดรายการ (ซ่อนไว้ กดเปิดเมื่อต้องแก้ข้อมูลผิด)
type ItemWithPackages = ItemWithContainer & { packages: ItemPackage[] };

function ItemEditForm({ item, containerOptions }: { item: ItemWithPackages; containerOptions: ContainerOption[] }) {
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
        <Field label="ราคาต่อหน่วย">
          <input name="unitPrice" type="number" step="0.01" min={0} defaultValue={item.unitPrice ?? ""} className="input bg-white" />
        </Field>
        <div className="sm:col-span-2 lg:col-span-4 [&_input]:bg-white">
          <span className="mb-1 block text-sm text-gray-600">พัสดุ</span>
          <PackageFields defaults={item.packages} />
        </div>
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
        <Field label="อยู่ระหว่างการผลิต">
          <input name="productionAt" type="datetime-local" defaultValue={toLocalInputValue(item.productionAt)} className="input bg-white" />
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

// แสดงข้อมูล 1 ช่อง (ไม่มีค่า = ขีด)
function Info({ label, children, wide }: { label: string; children: React.ReactNode; wide?: boolean }) {
  const empty = children == null || children === "" || children === false;
  return (
    <div className={wide ? "sm:col-span-2 lg:col-span-3" : ""}>
      <dt className="text-xs text-gray-500">{label}</dt>
      <dd className="mt-0.5 break-words whitespace-pre-line">{empty ? <span className="text-gray-400">-</span> : children}</dd>
    </div>
  );
}

// รายละเอียดสินค้า: ยอดรวม + พัสดุแต่ละแถว
function ItemDetails({ item, currency, showPrice = true }: { item: ItemWithPackages; currency: CurrencyCode; showPrice?: boolean }) {
  return (
    <>
      <p className="font-medium">
        {item.description}
        {item.quantity ? <span className="text-gray-500"> × {item.quantity}</span> : null}
        {showPrice && item.unitPrice != null && (
          <span className="ml-2 text-sm font-normal text-gray-600">@ {formatMoney(item.unitPrice, currency)}</span>
        )}
      </p>
      <p className="text-xs text-gray-500">
        {[
          item.packages.length > 1 && `${item.packages.length} พัสดุ`,
          item.boxes != null && `${item.boxes} กล่อง`,
          item.weightKg != null && `${item.weightKg} กก.`,
          item.cbm != null && `${item.cbm} คิว`,
        ]
          .filter(Boolean)
          .join(" · ") || "ยังไม่มีขนาด/น้ำหนัก"}
      </p>
      {item.packages.length > 0 && (
        <ul className="mt-1 space-y-0.5 text-xs text-gray-500">
          {item.packages.map((p) => (
            <li key={p.id}>
              └{" "}
              {[
                p.chinaTrackingNo && `พัสดุจีน ${p.chinaTrackingNo}`,
                p.boxes != null && `${p.boxes} กล่อง`,
                p.widthCm && p.lengthCm && p.heightCm && `${p.widthCm}×${p.lengthCm}×${p.heightCm} ซม.`,
                p.weightKg != null && `${p.weightKg} กก.`,
                p.cbm != null && `${p.cbm} คิว`,
              ]
                .filter(Boolean)
                .join(" · ")}
            </li>
          ))}
        </ul>
      )}
      {item.domesticTracking && <p className="mt-1 text-xs text-gray-500">เลขพัสดุในไทย: {item.domesticTracking}</p>}
    </>
  );
}

function ContainerLink({ item }: { item: ItemWithPackages }) {
  return item.container ? (
    <Link href={`/admin/containers/${item.container.id}`} className="text-brand-600 hover:underline">
      ตู้ {item.container.code}
    </Link>
  ) : (
    <span className="text-gray-400">ยังไม่เข้าตู้</span>
  );
}

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ edit?: string }> };

// ปกติแสดงข้อมูลอย่างเดียว · กด "แก้ไข" (?edit=1) จึงเปิดฟอร์มอัปเดตสถานะ / เพิ่ม-แก้รายการ / แก้ข้อมูลออเดอร์
export default async function OrderPage({ params, searchParams }: Props) {
  await requireUser();
  const { id } = await params;
  const editing = (await searchParams).edit === "1";
  const order = await db.query.orders.findFirst({
    where: eq(orders.id, Number(id)),
    with: { items: { with: { container: true, packages: true } } },
  });
  if (!order) notFound();
  const customers = await listCustomersForPicker();

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
  // ค่าเริ่มต้นของแถบอัปเดต = ขั้นถัดไปของรายการที่ช้าที่สุด (ข้ามขั้นที่ไม่บังคับ เช่น อยู่ระหว่างการผลิต)
  let nextStage: ItemStage = itemStages[Math.min(stageIndex(summary.stage) + 1, itemStages.length - 1)];
  if (optionalStages.has(nextStage)) nextStage = itemStages[stageIndex(nextStage) + 1];

  const header = (
    <div>
      <Link href="/admin/orders" className="text-sm text-gray-500 hover:underline">← ออเดอร์ทั้งหมด</Link>
      <div className="mt-1 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold">{order.code}</h1>
        <StageBadge stage={summary.stage} />
        <span className="ml-auto flex items-center gap-3">
          {editing ? (
            <Link href={`/admin/orders/${order.id}`} className="btn-secondary">✓ เสร็จแล้ว</Link>
          ) : (
            <Link href={`/admin/orders/${order.id}?edit=1`} className="btn-primary">✏️ แก้ไข / อัปเดตสถานะ</Link>
          )}
          <DeleteOrderButton
            orderId={order.id}
            code={order.code}
            customerName={order.customerName}
            itemCount={summary.itemCount}
            fromJj={Boolean(order.importKey?.startsWith("jj:"))}
          />
        </span>
      </div>
      {!order.customerPhone && (
        <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
          ⚠️ ยังไม่มีเบอร์โทรลูกค้า ลูกค้าจะเช็คสถานะเองไม่ได้ — กด &quot;แก้ไข&quot; แล้วเลือกลูกค้าจากทะเบียน
        </p>
      )}
    </div>
  );

  if (!editing) {
    return (
      <div className="space-y-6">
        {header}

        <Card title="ข้อมูลออเดอร์">
          <dl className="grid gap-x-6 gap-y-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
            <Info label="ลูกค้า">
              {order.customerId ? (
                <Link href={`/admin/customers/${order.customerId}`} className="font-medium text-brand-700 hover:underline">
                  {order.customerName}
                </Link>
              ) : (
                order.customerName
              )}
            </Info>
            <Info label="เบอร์โทร">{order.customerPhone}</Info>
            <Info label="LINE ID">{order.customerLineId}</Info>
            <Info label="วิธีขนส่ง">{methodLabel(order.method)}</Info>
            <Info label="ตู้">
              {[...new Map(order.items.filter((i) => i.container).map((i) => [i.container!.id, i.container!])).values()].map(
                (c, n) => (
                  <span key={c.id}>
                    {n > 0 && ", "}
                    <Link href={`/admin/containers/${c.id}`} className="text-brand-700 hover:underline">{c.code}</Link>
                  </span>
                ),
              )}
              {order.items.length > 0 && order.items.every((i) => !i.container) && <span className="text-gray-400">ยังไม่เข้าตู้</span>}
            </Info>
            <Info label="เลขคำสั่งซื้อ">{order.purchaseOrderNo}</Info>
            <Info label="ร้านค้า">{order.shopName}</Info>
            <Info label="ค่าสินค้า (ยอดเต็ม)">{order.totalAmount != null && formatMoney(order.totalAmount, order.currency)}</Info>
            <Info label="มัดจำค่าสินค้า">{order.depositAmount != null && formatMoney(order.depositAmount, order.currency)}</Info>
            <Info label={`ค่าดำเนินการ ${order.handlingFeePct}%`}>{order.totalAmount != null && formatMoney(handlingFeeOf(order.totalAmount, order.handlingFeePct), order.currency)}</Info>
            <Info label="ค่าสินค้าค้างชำระ">
              <BalanceText total={order.totalAmount} deposit={order.depositAmount} currency={order.currency} />
            </Info>
            <Info label="Tracking no. จีน → ไทย">{order.intlTrackingNo}</Info>
            <Info label="บริษัทขนส่งที่รับงานต่อ">{order.provider}</Info>
            <Info label="External ID">{order.externalId}</Info>
            <Info label="หมายเหตุถึงลูกค้า" wide>{order.note}</Info>
            <Info label="หมายเหตุภายใน" wide>{order.internalNote}</Info>
          </dl>
        </Card>

        <Card title={`รายการสินค้า (${order.items.length}) · ส่งแล้ว ${summary.deliveredCount}/${summary.itemCount}`}>
          {order.items.length === 0 ? (
            <p className="text-sm text-gray-500">ยังไม่มีรายการสินค้า — กด &quot;แก้ไข&quot; เพื่อเพิ่ม</p>
          ) : (
            <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200">
              {order.items.map((item, idx) => {
                const stage = stages[idx];
                return (
                  <li key={item.id} className="flex flex-wrap items-center gap-3 p-3">
                    <div className="min-w-48 flex-1"><ItemDetails item={item} currency={order.currency} /></div>
                    <div className="w-32 text-sm"><ContainerLink item={item} /></div>
                    <div className="w-56 text-right">
                      <StageBadge stage={stage} />
                      <p className="mt-0.5 text-xs text-gray-500">{formatThaiDateTime(itemStageDates(item, item.container)[stage])}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <p className="text-xs text-gray-400">
          สร้างเมื่อ {formatThaiDateTime(order.createdAt)} · แก้ไขล่าสุด {formatThaiDateTime(order.updatedAt)}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {header}

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
                      <div className="min-w-48 flex-1"><ItemDetails item={item} currency={order.currency} showPrice={false} /></div>
                      {/* แก้ราคาต่อหน่วยได้ตรงนี้เลย ไม่ต้องเปิด "แก้ไขรายละเอียด" */}
                      <form action={updateItemPrice} className="flex items-center gap-1.5">
                        <input type="hidden" name="itemId" value={item.id} />
                        <label className="text-xs text-gray-500" htmlFor={`price-${item.id}`}>ราคา/หน่วย</label>
                        <span className="w-28">
                          <input
                            id={`price-${item.id}`}
                            name="unitPrice"
                            type="number"
                            step="0.01"
                            min={0}
                            defaultValue={item.unitPrice ?? ""}
                            placeholder={currencyLabel[order.currency]}
                            className="input py-1 text-sm"
                          />
                        </span>
                        <button className="rounded border border-brand-600 px-2 py-1 text-xs font-medium text-brand-600 hover:bg-brand-50">บันทึก</button>
                      </form>
                      <div className="w-32 text-sm"><ContainerLink item={item} /></div>
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
              defaultStage={nextStage}
              defaultAt={nowLocalInputValue()}
              containerOptions={containerOptions}
              sharedContainerNote={sharedContainerNote}
              hasItemsInContainer={order.items.some((i) => i.containerId)}
            />
          </>
        )}

        <form action={addItem} className="mt-6 border-t border-gray-100 pt-4">
          <input type="hidden" name="orderId" value={order.id} />
          <p className="mb-2 text-sm font-medium">+ เพิ่มรายการสินค้า</p>
          <div className="space-y-2">
            <div className="grid gap-2 sm:grid-cols-[3fr_1fr_1fr]">
              <input name="description" required placeholder="ชื่อสินค้า *" className="input" />
              <input name="quantity" type="number" min={0} placeholder="จำนวน" className="input" />
              <input name="unitPrice" type="number" step="0.01" min={0} placeholder="ราคาต่อหน่วย" className="input" />
            </div>
            <PackageFields />
            <button className="btn-primary">เพิ่มรายการ</button>
          </div>
          <p className="mt-2 text-xs text-gray-500">สินค้าชิ้นเดียวกันที่แบ่งไปหลายตู้ ให้เพิ่มเป็นหลายรายการ</p>
        </form>
      </Card>

      <Card title="แก้ไขข้อมูลลูกค้าและออเดอร์">
        <form action={updateOrder} className="grid gap-4 sm:grid-cols-2">
          <input type="hidden" name="id" value={order.id} />
          <OrderFields order={order} customers={customers} />
          <div className="flex items-center gap-3 sm:col-span-2">
            <button className="btn-primary">บันทึก</button>
            <Link href={`/admin/orders/${order.id}`} className="text-sm text-gray-500 hover:underline">ยกเลิก</Link>
          </div>
        </form>
        <p className="mt-3 text-xs text-gray-400">
          สร้างเมื่อ {formatThaiDateTime(order.createdAt)} · แก้ไขล่าสุด {formatThaiDateTime(order.updatedAt)}
        </p>
      </Card>
    </div>
  );
}
