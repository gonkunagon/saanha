import Link from "next/link";
import { notFound } from "next/navigation";
import { desc, eq, inArray, isNull, ne, and } from "drizzle-orm";
import { db } from "@/db";
import { containers, orderItems, orders } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { containerStageOf, stageOfItem, summarizeOrder, type ItemWithContainer } from "@/lib/orders";
import { formatThaiDateTime, nowLocalInputValue } from "@/lib/datetime";
import { itemStageDates, itemStages, optionalStages, stageIndex, stageLabelsTh, type ItemStage } from "@/lib/stages";
import { Card, Field, StageBadge, methodLabel } from "@/components/admin/ui";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { OrderFields } from "../OrderFields";
import { listCustomersForPicker } from "@/lib/customers";
import { deleteItem, updateItem, updateOrder } from "../actions";
import { ItemPriceCells } from "./ItemPriceForm";
import { PaymentsPanel } from "./PaymentsCard";
import { DeleteOrderButton } from "@/components/admin/DeleteOrderButton";
import { BalanceText } from "@/components/admin/ui";
import { balanceOf, currencyLabel, customerGoodsOf, customerShippingOf, customerTotalOf, formatMoney, orderBalance, paidOf, shopPaidOf, shopPaidRateOf, supplierTotalOf, type CurrencyCode } from "@/lib/money";
import { StageUpdateForm, type ContainerOption } from "./StageUpdateForm";
import { PackageFields } from "@/components/admin/PackageFields";
import { deleteItemImage, uploadItemImages } from "../image-actions";
import type { ItemPackage } from "@/db/schema";

const STAGE_FORM = "stage-form";

// ฟอร์มแก้ไขรายละเอียดรายการ (ซ่อนไว้ กดเปิดเมื่อต้องแก้ข้อมูลผิด)
type ItemWithPackages = ItemWithContainer & { packages: ItemPackage[]; images: { id: number }[] };

function ItemEditForm({ item }: { item: ItemWithPackages }) {
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
        <Field label="ลิงก์สินค้า (ใช้ภายใน ลูกค้าไม่เห็น)" className="sm:col-span-2 lg:col-span-4">
          <input name="productUrl" type="url" defaultValue={item.productUrl ?? ""} className="input bg-white" placeholder="https://detail.1688.com/offer/..." />
        </Field>
        <Field label="รายละเอียด / ขนาด / สี (แสดงในหน้ารายละเอียดสินค้าของใบเสนอราคา)" className="sm:col-span-2 lg:col-span-4">
          <textarea name="spec" rows={2} defaultValue={item.spec ?? ""} className="input bg-white" placeholder="เช่น ขนาด 30 ซม. · สีขาว · 220V" />
        </Field>
        <Field label="ราคาต่อหน่วย">
          <input name="unitPrice" type="number" step="0.01" min={0} defaultValue={item.unitPrice ?? ""} className="input bg-white" />
        </Field>
      </div>
      <div className="mt-3 flex items-center justify-between">
        <button className="rounded-lg border border-gray-300 bg-white px-4 py-1.5 text-sm hover:bg-gray-100">บันทึกการแก้ไข</button>
        <ConfirmButton formAction={deleteItem} message={`ลบรายการ "${item.description}"?`}>ลบรายการ</ConfirmButton>
      </div>
      <p className="mt-2 text-xs text-gray-500">
        พัสดุและตู้ แก้ที่ &quot;แก้ไขข้อมูลออเดอร์&quot; ด้านล่าง · วันที่ของแต่ละสถานะ อัปเดตที่กล่อง &quot;อัปเดตสถานะรายการที่เลือก&quot;
      </p>
    </form>
  );
}

// พัสดุ + ตู้ ของแต่ละรายการ — อยู่ในฟอร์ม "แก้ไขข้อมูลออเดอร์" (ชื่อช่องมีเลขรายการกำกับ บันทึกพร้อมออเดอร์)
function ItemShippingFields({ item, containerOptions }: { item: ItemWithPackages; containerOptions: ContainerOption[] }) {
  return (
    <div className="rounded-lg bg-gray-50 p-3 [&_input]:bg-white">
      <input type="hidden" name="shipItemId" value={item.id} />
      <p className="mb-2 text-sm font-medium">
        {item.description}
        {item.quantity ? <span className="font-normal text-gray-500"> × {item.quantity}</span> : null}
      </p>
      <PackageFields prefix={`pkg_${item.id}_`} defaults={item.packages} />
      <label className="mt-3 block">
        <span className="mb-1 block text-sm text-gray-600">ตู้</span>
        <span className="block w-full max-w-xs">
          <select name={`containerCode_${item.id}`} defaultValue={item.container?.code ?? ""} className="input bg-white">
            <option value="">— ไม่อยู่ในตู้ —</option>
            {item.container && !containerOptions.some((c) => c.code === item.container!.code) && (
              <option value={item.container.code}>{item.container.code}</option>
            )}
            {containerOptions.map((c) => (
              <option key={c.code} value={c.code}>{c.label}</option>
            ))}
          </select>
        </span>
      </label>
    </div>
  );
}

// รูปสินค้าในโหมดแก้ไข: ดู / ลบ / อัปโหลดเพิ่ม (ใช้ในหน้ารายละเอียดสินค้าของใบเสนอราคา)
function ItemPhotos({ item }: { item: ItemWithPackages }) {
  return (
    <div className="mt-2 pl-8">
      <div className="flex flex-wrap items-end gap-2">
        {item.images.map((img) => (
          <form key={img.id} action={deleteItemImage} className="relative">
            <input type="hidden" name="imageId" value={img.id} />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/admin/item-image/${img.id}`} alt="" className="h-20 w-20 rounded-lg border border-gray-200 object-cover" />
            <ConfirmButton
              message="ลบรูปนี้?"
              className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-white text-sm text-brand-600 shadow ring-1 ring-gray-200 hover:bg-brand-50"
            >
              ✕
            </ConfirmButton>
          </form>
        ))}
        {item.images.length < 6 && (
          <form action={uploadItemImages} className="flex flex-wrap items-center gap-2 rounded-lg border border-dashed border-gray-300 px-3 py-2">
            <input type="hidden" name="itemId" value={item.id} />
            <input name="images" type="file" accept="image/*" multiple required className="max-w-52 text-xs file:mr-2 file:rounded file:border-0 file:bg-brand-50 file:px-2 file:py-1 file:text-brand-700" />
            <button className="rounded border border-brand-600 px-2 py-1 text-xs font-medium text-brand-600 hover:bg-brand-50">📷 อัปโหลดรูปสินค้า</button>
          </form>
        )}
      </div>
    </div>
  );
}

// ลิงก์หน้าสินค้า (ภายใน) เปิดแท็บใหม่ — แสดงแค่ชื่อเว็บให้สั้น
function ProductLink({ href }: { href: string }) {
  let host = href;
  try {
    host = new URL(href).hostname.replace(/^www\./, "");
  } catch {}
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-brand-700 hover:underline">
      🔗 ลิงก์สินค้า ({host})
    </a>
  );
}

// แสดงข้อมูล 1 ช่อง (ไม่มีค่า = ขีด)
// กรอบย่อยในข้อมูลออเดอร์ (หัวข้อ + ช่องข้อมูล 3 คอลัมน์) — กรอบสรุปยอดชำระพื้นสีอ่อนให้เห็นเด่น
// tone: money = ยอดที่คิดลูกค้า (เหลือง) · cost = ยอดที่จ่ายร้านค้า (เขียว)
function InfoSection({ title, tone, children, footer }: { title: string; tone?: "money" | "cost"; children: React.ReactNode; footer?: React.ReactNode }) {
  const toneClass = tone === "money" ? "border-accent-300 bg-accent-300/10" : tone === "cost" ? "border-emerald-300 bg-emerald-50" : "border-gray-200";
  return (
    <section className={`rounded-lg border p-4 ${toneClass}`}>
      <h3 className="mb-3 text-sm font-semibold text-gray-800">{title}</h3>
      <dl className="grid gap-x-6 gap-y-4 text-sm sm:grid-cols-2 lg:grid-cols-3">{children}</dl>
      {footer}
    </section>
  );
}

// ยอดเป็นบาท: ออเดอร์บาทใช้ยอดเดิม · ออเดอร์หยวนคูณเรท (ไม่มีเรท = ไม่รู้)
const toThb = (amount: number | null, rate: number | null, currency: CurrencyCode) =>
  amount == null ? null : currency === "THB" ? amount : rate != null ? Math.round(amount * rate * 100) / 100 : null;

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
function ItemDetails({ item }: { item: ItemWithPackages }) {
  return (
    <>
      <p className="font-medium">
        {item.description}
        {item.quantity ? <span className="text-gray-500"> × {item.quantity}</span> : null}
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
                p.chinaTrackingNo && `Tracking ${p.chinaTrackingNo}`,
                p.boxes != null && `${p.boxes} กล่อง`,
                p.widthCm && p.lengthCm && p.heightCm && `${p.widthCm}×${p.lengthCm}×${p.heightCm} ซม.`,
                p.weightKg != null && (p.boxes && p.boxes > 1 ? `${p.weightKg} กก./กล่อง` : `${p.weightKg} กก.`),
                p.cbm != null && `${p.cbm} คิว`,
              ]
                .filter(Boolean)
                .join(" · ")}
            </li>
          ))}
        </ul>
      )}
      {item.spec && <p className="mt-1 text-sm whitespace-pre-line text-gray-700">{item.spec}</p>}
      {item.productUrl && <ProductLink href={item.productUrl} />}
      {item.images.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {item.images.map((img) => (
            // eslint-disable-next-line @next/next/no-img-element
            <a key={img.id} href={`/admin/item-image/${img.id}`} target="_blank"><img src={`/admin/item-image/${img.id}`} alt="" className="h-14 w-14 rounded border border-gray-200 object-cover" /></a>
          ))}
        </div>
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

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ edit?: string; pay?: string }> };

// ปกติแสดงข้อมูลอย่างเดียว · กด "แก้ไข" (?edit=1) จึงเปิดฟอร์มอัปเดตสถานะ / เพิ่ม-แก้รายการ / แก้ข้อมูลออเดอร์
export default async function OrderPage({ params, searchParams }: Props) {
  await requireUser();
  const { id } = await params;
  const sp = await searchParams;
  const editing = sp.edit === "1";
  // ?pay=1 = เพิ่ม/ลบการชำระเงินในหน้าดูออเดอร์ (ไม่อยู่ในหน้าแก้ไขออเดอร์)
  // ?pay=in = แก้รายการรับเงินจากลูกค้า · ?pay=out = แก้รายการจ่ายร้านค้า (pay=1 เดิม = in)
  const payEditing = sp.pay === "out" ? "out" : sp.pay === "in" || sp.pay === "1" ? "in" : null;
  const order = await db.query.orders.findFirst({
    where: eq(orders.id, Number(id)),
    // รูปสินค้าโหลดแค่ id (ตัวรูปดึงผ่าน /admin/item-image/<id>)
    with: { items: { with: { container: true, packages: true, images: { columns: { id: true } } } }, payments: true, customer: { columns: { address: true } } },
  });
  if (!order) notFound();
  const customers = await listCustomersForPicker();
  // เงินเข้า (ลูกค้าโอน) / เงินออก (จ่ายร้าน) · เรทที่เราจ่าย = ที่กรอกในออเดอร์ หรือเรทเฉลี่ยจากรายการจ่ายร้าน
  const inPayments = order.payments.filter((p) => p.direction !== "out");
  const shopPaid = shopPaidOf(order.payments);
  const costRate = order.costRate ?? shopPaidRateOf(order.payments);

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
          {editing && <Link href={`/admin/orders/${order.id}`} className="btn-secondary">✓ เสร็จแล้ว</Link>}
          <Link href={`/admin/quote/${order.id}`} target="_blank" className="btn-secondary">📄 ใบเสนอราคา</Link>
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
          ⚠️ ยังไม่มีเบอร์โทรลูกค้า ลูกค้าจะเช็คสถานะเองไม่ได้ —{" "}
          {order.customerId ? (
            <Link href={`/admin/customers/${order.customerId}`} className="font-medium underline">เพิ่มเบอร์ที่หน้าลูกค้า</Link>
          ) : (
            <>กด &quot;แก้ไข&quot; แล้วเลือกลูกค้าจากทะเบียน</>
          )}
        </p>
      )}
    </div>
  );

  if (!editing) {
    return (
      <div className="space-y-6">
        {header}

        <Card
          title="ข้อมูลออเดอร์"
          actions={
            // ปุ่มขอบแดงแบบเดียวกับ "แก้ไขการชำระเงิน"
            <Link
              href={`/admin/orders/${order.id}?edit=1`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-brand-600 px-3 py-1.5 text-sm font-medium text-brand-600 hover:bg-brand-50"
            >
              ✏️ แก้ไข / อัปเดตสถานะ
            </Link>
          }
        >
          {/* แบ่งเป็น 3 กรอบ: ลูกค้า/คำสั่งซื้อ · ขนส่ง · สรุปยอดชำระ — หมายเหตุอยู่ล่างสุด */}
          <div className="space-y-4">
            <InfoSection title="ข้อมูลลูกค้า / คำสั่งซื้อ">
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
              <Info label="เลขคำสั่งซื้อ">{order.purchaseOrderNo}</Info>
              <Info label="ร้านค้า">
                {order.shopName}
                {order.shopName && order.hideShopOnQuote && <span className="ml-1 text-xs text-amber-700">(ไม่แสดงในใบเสนอราคา)</span>}
              </Info>
              <Info label="Platform (ภายใน)">{order.platform}</Info>
            </InfoSection>

            {/* รายการสินค้า (ใต้ข้อมูลลูกค้า) — ตู้และสถานะดูได้ที่ข้อมูลขนส่ง / ป้ายข้างเลขออเดอร์ */}
            <section className="rounded-lg border border-gray-200 p-4">
              <h3 className="mb-3 text-sm font-semibold text-gray-800">
                รายการสินค้า ({order.items.length}) · ส่งแล้ว {summary.deliveredCount}/{summary.itemCount}
              </h3>
              {order.items.length === 0 ? (
                <p className="text-sm text-gray-500">ยังไม่มีรายการสินค้า — กด &quot;แก้ไข&quot; เพื่อเพิ่ม</p>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {order.items.map((item, idx) => (
                    <li key={item.id} className="flex gap-3 py-3 first:pt-0 last:pb-0">
                      {/* เลือกรายการที่จะอัปเดตสถานะ (ฟอร์มอัปเดตสถานะด้านล่าง) */}
                      <input
                        type="checkbox"
                        name="itemId"
                        value={item.id}
                        form={STAGE_FORM}
                        defaultChecked={stages[idx] !== "delivered"}
                        className="mt-1 h-5 w-5 shrink-0 accent-brand-600"
                        aria-label={`เลือก ${item.description}`}
                      />
                      <div className="min-w-0 flex-1">
                        <ItemDetails item={item} />
                        <div className="mt-1 flex flex-wrap items-center gap-x-3 text-xs text-gray-500">
                          <StageBadge stage={stages[idx]} />
                          <span>{formatThaiDateTime(itemStageDates(item, item.container)[stages[idx]])}</span>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* อัปเดตสถานะได้เลยจากหน้านี้ (ไม่ต้องกดแก้ไข) */}
            {order.items.length > 0 && (
              <StageUpdateForm
                key={summary.stage}
                formId={STAGE_FORM}
                orderId={order.id}
                defaultStage={nextStage}
                defaultAt={nowLocalInputValue()}
                containerOptions={containerOptions}
                sharedContainerNote={sharedContainerNote}
                hasItemsInContainer={order.items.some((i) => i.containerId)}
              />
            )}

            <InfoSection title="ข้อมูลขนส่ง">
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
              <Info label="บริษัทขนส่งที่รับงานต่อ">{order.provider}</Info>
              {/* ที่อยู่ของออเดอร์นี้ ไม่ได้กรอก = ที่อยู่ในข้อมูลลูกค้า */}
              <Info label="ที่อยู่จัดส่งสินค้า" wide>
                {order.deliveryAddress || order.customer?.address}
                {!order.deliveryAddress && order.customer?.address && <span className="ml-1 text-xs text-gray-500">(จากข้อมูลลูกค้า)</span>}
              </Info>
            </InfoSection>

            {/* ยอดเงิน 2 ฝั่ง: จ่ายร้านค้า (ต้นทุน) กับ คิดลูกค้า — ราคาและเรทไม่เท่ากัน */}
            <InfoSection title="ยอดที่จ่ายร้านค้า" tone="cost" footer={<PaymentsPanel order={order} payments={order.payments} direction="out" editing={payEditing === "out"} />}>
              <Info label="ค่าสินค้า (จ่ายร้าน)">{order.totalAmount != null && formatMoney(order.totalAmount, order.currency)}</Info>
              <Info label="ค่าขนส่งภายในจีน (จ่ายร้าน)">{order.chinaShippingFee != null && formatMoney(order.chinaShippingFee, order.currency)}</Info>
              <Info label="รวมจ่ายร้าน">{supplierTotalOf(order) != null && <b>{formatMoney(supplierTotalOf(order), order.currency)}</b>}</Info>
              {order.currency === "CNY" && (
                <>
                  <Info label="เรทที่เราจ่าย">
                    {costRate != null && `${costRate} บาท / หยวน`}
                    {order.costRate == null && costRate != null && <span className="ml-1 text-xs text-gray-500">(เฉลี่ยจากรายการจ่าย)</span>}
                  </Info>
                  <Info label="คิดเป็นเงินบาท">{toThb(supplierTotalOf(order), costRate, order.currency) != null && formatMoney(toThb(supplierTotalOf(order), costRate, order.currency), "THB")}</Info>
                </>
              )}
              <Info label="จ่ายร้านแล้ว">{shopPaid != null && formatMoney(shopPaid, order.currency)}</Info>
              <Info label="ค้างจ่ายร้าน">
                {shopPaid != null && supplierTotalOf(order) != null && <BalanceText balance={balanceOf(supplierTotalOf(order), shopPaid)} currency={order.currency} />}
              </Info>
            </InfoSection>

            <InfoSection title="ยอดที่คิดลูกค้า" tone="money" footer={<PaymentsPanel order={order} payments={order.payments} direction="in" editing={payEditing === "in"} />}>
              <Info label={order.customerGoodsAmount == null && order.handlingFeePct > 0 ? `ค่าสินค้า (คิดลูกค้า · รวมค่าดำเนินการ ${order.handlingFeePct}%)` : "ค่าสินค้า (คิดลูกค้า)"}>
                {customerGoodsOf(order) != null && formatMoney(customerGoodsOf(order), order.currency)}
              </Info>
              <Info label="ค่าขนส่งภายในจีน (คิดลูกค้า)">{customerShippingOf(order) != null && formatMoney(customerShippingOf(order), order.currency)}</Info>
              <Info label="รวมเป็นเงินทั้งสิ้น">{customerTotalOf(order) != null && <b>{formatMoney(customerTotalOf(order), order.currency)}</b>}</Info>
              {order.currency === "CNY" && (
                <>
                  <Info label="เรทคิดลูกค้า">{order.orderRate != null && `${order.orderRate} บาท / หยวน`}</Info>
                  <Info label="คิดเป็นเงินบาท">{toThb(customerTotalOf(order), order.orderRate, order.currency) != null && <b>{formatMoney(toThb(customerTotalOf(order), order.orderRate, order.currency), "THB")}</b>}</Info>
                </>
              )}
              {/* ยอดที่จ่ายแล้ว/ค้างชำระ คิดจากรายการชำระเงิน (ออเดอร์เก่าที่ยังไม่มีรายการ ใช้ช่องมัดจำ) */}
              <Info label={inPayments.length || order.balancePaidAmount != null ? "ชำระแล้ว" : "มัดจำค่าสินค้า"}>
                {paidOf(order, order.payments) != null && formatMoney(paidOf(order, order.payments), order.currency)}
              </Info>
              <Info label="ยอดค้างชำระ">
                <BalanceText balance={orderBalance(order, order.payments)} currency={order.currency} />
              </Info>
            </InfoSection>

            <dl className="grid gap-x-6 gap-y-4 px-1 text-sm sm:grid-cols-2 lg:grid-cols-3">
              <Info label="หมายเหตุถึงลูกค้า" wide>{order.note}</Info>
              <Info label="หมายเหตุภายใน" wide>{order.internalNote}</Info>
            </dl>
          </div>
        </Card>


        <p className="text-xs text-gray-400">
          สร้างเมื่อ {formatThaiDateTime(order.createdAt)} · แก้ไขล่าสุด {formatThaiDateTime(order.updatedAt)}
        </p>
      </div>
    );
  }

  // แถวรวมของตารางรายการสินค้า: จำนวนรวม · Σ (จำนวน × ราคาซื้อ) · Σ (จำนวน × ราคาขาย) — ไม่มีราคาเลยสักรายการ = ขีด
  type Item = (typeof order.items)[number];
  const sumOf = (pick: (i: Item) => number | null) =>
    order.items.some((i) => pick(i) != null)
      ? Math.round(order.items.reduce((s, i) => s + (pick(i) ?? 0) * (i.quantity ?? 1), 0) * 100) / 100
      : null;
  const itemTotals = {
    qty: order.items.reduce((s, i) => s + (i.quantity ?? 0), 0),
    buy: sumOf((i) => i.unitPrice),
    sell: sumOf((i) => i.sellPrice),
  };

  return (
    <div className="space-y-6">
      {header}

      <Card title={`รายการสินค้า (${order.items.length})`}>
        {order.items.length > 0 && (
          <>
            {/* ตารางรายการสินค้า: ชื่อสินค้า · จำนวน · ราคาซื้อ · ราคาขาย (ต่อหน่วย แก้ได้ในช่อง) + แถวรวมทุกรายการ */}
            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="w-full min-w-[40rem] text-sm">
                <thead className="bg-gray-50 text-left text-xs text-gray-500">
                  <tr>
                    <th className="px-3 py-2">ชื่อสินค้า</th>
                    <th className="w-24 px-3 py-2 text-right">จำนวน</th>
                    <th className="w-40 px-3 py-2 text-right">ราคาซื้อ / หน่วย ({currencyLabel[order.currency]})</th>
                    <th className="w-40 px-3 py-2 text-right">ราคาขาย / หน่วย ({currencyLabel[order.currency]})</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {order.items.map((item, idx) => {
                    const stage = stages[idx];
                    const at = itemStageDates(item, item.container)[stage];
                    return (
                      <tr key={item.id} className="align-top">
                        <td className="px-3 py-3">
                          <ItemDetails item={item} />
                          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
                            <StageBadge stage={stage} />
                            <span>{formatThaiDateTime(at)}</span>
                            <ContainerLink item={item} />
                          </div>
                          <details className="group mt-2">
                            {/* ทำเป็นปุ่มขอบแดง ให้เห็นชัดว่ากดแก้ไขได้ */}
                            <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 rounded-lg border border-brand-600 px-3 py-1 text-xs font-medium text-brand-600 select-none hover:bg-brand-50 [&::-webkit-details-marker]:hidden">
                              ✏️ <span className="group-open:hidden">แก้ไขรายละเอียด / รูป</span><span className="hidden group-open:inline">ปิดการแก้ไข</span>
                            </summary>
                            <ItemEditForm item={item} />
                            <ItemPhotos item={item} />
                          </details>
                        </td>
                        <td className="px-3 py-3 text-right whitespace-nowrap">{item.quantity ?? "-"}</td>
                        <ItemPriceCells itemId={item.id} quantity={item.quantity} unitPrice={item.unitPrice} sellPrice={item.sellPrice} />
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="border-t-2 border-gray-300 bg-gray-50 font-semibold">
                  <tr>
                    <td className="px-3 py-2">รวมทุกรายการ</td>
                    <td className="px-3 py-2 text-right">{itemTotals.qty.toLocaleString("th-TH")}</td>
                    <td className="px-3 py-2 text-right">{itemTotals.buy == null ? "-" : formatMoney(itemTotals.buy, order.currency)}</td>
                    <td className="px-3 py-2 text-right text-brand-700">{itemTotals.sell == null ? "-" : formatMoney(itemTotals.sell, order.currency)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

          </>
        )}
      </Card>

      <Card title="แก้ไขข้อมูลออเดอร์">
        <form action={updateOrder} className="grid gap-4 sm:grid-cols-2">
          <input type="hidden" name="id" value={order.id} />
          <OrderFields
            // ค่าสินค้าตามตารางรายการสินค้า (ถ้ามีราคา) — ช่องในฟอร์มเป็นแบบอ่านอย่างเดียว
            order={{ ...order, totalAmount: itemTotals.buy ?? order.totalAmount, customerGoodsAmount: itemTotals.sell ?? order.customerGoodsAmount }}
            customers={customers}
            paymentsLinked={order.payments.some((p) => p.direction !== "out")}
            goodsFromItems={{ buy: order.items.some((i) => i.unitPrice != null), sell: order.items.some((i) => i.sellPrice != null) }}
            shipping={
              order.items.length > 0 && (
                <div className="space-y-3 sm:col-span-2">
                  <span className="block text-sm text-gray-600">พัสดุ / ตู้ ของแต่ละรายการ</span>
                  {order.items.map((item) => (
                    <ItemShippingFields key={item.id} item={item} containerOptions={containerOptions} />
                  ))}
                </div>
              )
            }
          />
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
