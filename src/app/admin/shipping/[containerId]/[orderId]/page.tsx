import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import signature from "@/assets/signature.png";
import { db } from "@/db";
import { containers, orderItems, orders } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { site } from "@/config/site";
import { formatMoney } from "@/lib/money";
import { amountInThaiWords } from "@/lib/thaiText";
import { shippingCostOf, shippingRateOf } from "@/lib/shipping";
import { methodLabel } from "@/components/admin/ui";
import { PrintButton } from "../../../quote/[id]/PrintButton";

// ใบสรุปค่าขนส่ง (หน้าพิมพ์ A4 แบบเดียวกับใบเสนอราคา) — ค่าขนส่งจีน → ไทย ของ 1 ออเดอร์ใน 1 ตู้
// ค่าขนส่ง = คิวรวม × เรท (บาท / คิว) ที่ตั้งในหน้าตู้

const thaiDate = (d: Date) => d.toLocaleDateString("th-TH", { timeZone: "Asia/Bangkok", dateStyle: "long" });
const num = (n: number | null, digits = 0) =>
  n == null ? "-" : n.toLocaleString("th-TH", { minimumFractionDigits: digits, maximumFractionDigits: Math.max(digits, 4) });

function InfoBox({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-lg border border-gray-200">
      <p className="bg-gray-50 px-4 py-1.5 text-[11px] font-semibold tracking-wide text-brand-700 uppercase">{title}</p>
      <div className="space-y-0.5 px-4 py-3 leading-6">{children}</div>
    </div>
  );
}

export default async function ShippingSummaryPage({ params }: { params: Promise<{ containerId: string; orderId: string }> }) {
  await requireUser();
  const { containerId, orderId } = await params;
  const [container, order] = await Promise.all([
    db.query.containers.findFirst({ where: eq(containers.id, Number(containerId)) }),
    db.query.orders.findFirst({ where: eq(orders.id, Number(orderId)), with: { customer: true } }),
  ]);
  if (!container || !order) notFound();
  const items = await db.query.orderItems.findMany({
    where: and(eq(orderItems.orderId, order.id), eq(orderItems.containerId, container.id)),
    with: { packages: true },
    orderBy: orderItems.id,
  });
  if (items.length === 0) notFound();

  const issued = new Date();
  const c = order.customer;
  const fullName = c && [c.firstName, c.lastName].filter(Boolean).join(" ");
  const total = (pick: (i: (typeof items)[number]) => number | null, digits: number) =>
    Math.round(items.reduce((s, i) => s + (pick(i) ?? 0), 0) * 10 ** digits) / 10 ** digits;
  const boxes = total((i) => i.boxes, 0);
  const kg = total((i) => i.weightKg, 2);
  const cbm = total((i) => i.cbm, 4);
  const rate = shippingRateOf(order.shippingRate);
  const cost = shippingCostOf(items, order.shippingRate);

  const meta = [
    ["อ้างอิงออเดอร์ / Ref.", order.code],
    ["วันที่ / Date", thaiDate(issued)],
    ["ตู้ / Container", container.code],
    ["วิธีขนส่ง / Method", methodLabel(container.method)],
  ];

  return (
    <div className="mx-auto max-w-[210mm] px-4 py-6 print:p-0">
      <div className="mb-4 flex items-center justify-between print:hidden">
        <Link href={`/admin/containers/${container.id}`} className="text-sm text-gray-500 hover:underline">← กลับไปหน้าตู้</Link>
        <PrintButton />
      </div>

      <article className="flex min-h-[297mm] flex-col bg-white text-[13px] text-gray-800 shadow-lg ring-1 ring-gray-200 [print-color-adjust:exact] print:min-h-0 print:shadow-none print:ring-0">
        {/* หัวกระดาษ: ชื่อเอกสารอย่างเดียว (ไม่แสดงข้อมูลบริษัท) */}
        <header className="flex items-end justify-between border-b-4 border-accent-400 bg-brand-700 px-10 pt-9 pb-6 text-white">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.3em] text-accent-300">SHIPPING SUMMARY</p>
            <h1 className="mt-1 text-[34px] leading-[1.5] font-bold">ใบสรุปค่าขนส่ง</h1>
          </div>
          <div className="pb-1.5 text-right">
            <p className="text-[11px] text-white/70">เลขที่อ้างอิง</p>
            <p className="text-lg font-semibold tracking-wide">{order.code}</p>
          </div>
        </header>

        <div className="flex flex-1 flex-col px-10 pt-7 pb-8">
          <dl className="grid grid-cols-4 divide-x divide-gray-200 rounded-lg border border-gray-200">
            {meta.map(([label, value]) => (
              <div key={label} className="px-4 py-2.5">
                <dt className="text-[10px] text-gray-500">{label}</dt>
                <dd className="mt-0.5 font-semibold text-gray-900">{value}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-5 grid grid-cols-2 gap-5">
            <InfoBox title="ลูกค้า / Customer">
              <p className="text-[15px] font-semibold text-gray-900">{order.customerName}</p>
              {fullName && <p>{fullName}</p>}
              {c?.address && <p className="whitespace-pre-line text-gray-600">{c.address}</p>}
              <p className="text-gray-600">เบอร์โทร: {order.customerPhone || "-"}</p>
              {order.customerLineId && <p className="text-gray-600">Line: {order.customerLineId}</p>}
            </InfoBox>
            <InfoBox title="รายละเอียดการขนส่ง / Shipment">
              <p><span className="inline-block w-28 text-gray-500">เลขคำสั่งซื้อ</span>{order.purchaseOrderNo ?? "-"}</p>
              <p><span className="inline-block w-28 text-gray-500">ตู้</span>{container.code}</p>
              <p><span className="inline-block w-28 text-gray-500">ปิดตู้ที่จีน</span>{container.loadedAt ? thaiDate(container.loadedAt) : "-"}</p>
              <p><span className="inline-block w-28 text-gray-500">ถึงโกดังไทย</span>{container.arrivedAt ? thaiDate(container.arrivedAt) : "-"}</p>
            </InfoBox>
          </div>

          {/* รายการสินค้าในตู้นี้ + Tracking ของแต่ละพัสดุ */}
          <table className="mt-6 w-full border-separate border-spacing-0 text-[13px]">
            <thead>
              <tr className="text-brand-700 [&>th]:border-y-2 [&>th]:border-brand-600">
                <th className="w-12 rounded-l-lg border-l-2 px-3 py-2.5 text-center font-semibold">#</th>
                <th className="px-3 py-2.5 text-left font-semibold">รายการสินค้า / Description</th>
                <th className="w-20 px-3 py-2.5 text-right font-semibold">กล่อง</th>
                <th className="w-28 px-3 py-2.5 text-right font-semibold whitespace-nowrap">น้ำหนัก (กก.)</th>
                <th className="w-28 rounded-r-lg border-r-2 px-3 py-2.5 text-right font-semibold whitespace-nowrap">ปริมาตร (คิว)</th>
              </tr>
            </thead>
            <tbody>
              {items.map((i, n) => {
                const trackings = [...new Set(i.packages.map((p) => p.chinaTrackingNo).filter(Boolean))];
                return (
                  <tr key={i.id} className="align-top [&>td]:border-b [&>td]:border-gray-100">
                    <td className="px-3 py-2.5 text-center text-gray-500">{n + 1}</td>
                    <td className="px-3 py-2.5">
                      <p className="font-medium text-gray-900">
                        {i.description}
                        {i.quantity ? <span className="font-normal text-gray-500"> × {num(i.quantity)}</span> : null}
                      </p>
                      {trackings.length > 0 && <p className="mt-0.5 text-[11px] break-words text-gray-500">Tracking: {trackings.join(" · ")}</p>}
                    </td>
                    <td className="px-3 py-2.5 text-right">{num(i.boxes)}</td>
                    <td className="px-3 py-2.5 text-right">{num(i.weightKg, 2)}</td>
                    <td className="px-3 py-2.5 text-right">{num(i.cbm, 4)}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="font-semibold [&>td]:border-t-2 [&>td]:border-brand-600">
                <td className="px-3 py-2" />
                <td className="px-3 py-2 text-gray-600">รวม {items.length} รายการ</td>
                <td className="px-3 py-2 text-right">{num(boxes)}</td>
                <td className="px-3 py-2 text-right">{num(kg, 2)}</td>
                <td className="px-3 py-2 text-right">{num(cbm, 4)}</td>
              </tr>
            </tfoot>
          </table>

          <div className="mt-6 grid grid-cols-[1fr_18rem] gap-6">
            <div className="space-y-4">
              <div className="rounded-lg border border-accent-400 bg-accent-300/15 px-4 py-3">
                <p className="text-[10px] text-gray-500">ค่าขนส่ง (ตัวอักษร)</p>
                <p className="font-semibold text-gray-900">({amountInThaiWords(cost, "THB")})</p>
              </div>
              <div>
                <p className="mb-1 text-[11px] font-semibold tracking-wide text-brand-700 uppercase">หมายเหตุ / Notes</p>
                <ol className="list-decimal space-y-0.5 pl-5 text-[12px] leading-5 text-gray-600">
                  <li>ค่าขนส่งจีน–ไทย คิดตามปริมาตรจริงที่วัด ณ โกดัง ({num(rate)} บาท / คิว)</li>
                  <li>ไม่รวมค่าจัดส่งในประเทศ ค่าตีลังไม้ และค่าประกันสินค้า (ถ้ามี)</li>
                </ol>
              </div>
            </div>
            <dl className="self-start overflow-hidden rounded-lg border-2 border-brand-600">
              <div className="flex justify-between px-4 py-2 text-[12px] text-gray-600">
                <dt>ปริมาตรรวม</dt>
                <dd>{num(cbm, 4)} คิว</dd>
              </div>
              <div className="flex justify-between border-t border-gray-100 px-4 py-2 text-[12px] text-gray-600">
                <dt>เรทค่าขนส่ง</dt>
                <dd>{num(rate)} บาท / คิว</dd>
              </div>
              <div className="flex items-center justify-between border-t-2 border-brand-600 px-4 py-3.5 text-brand-700">
                <dt className="font-semibold">ค่าขนส่งทั้งสิ้น</dt>
                <dd className="text-lg font-bold">{formatMoney(cost, "THB")}</dd>
              </div>
            </dl>
          </div>

          <div className="mt-auto grid grid-cols-2 gap-10 pt-14 text-center text-[12px] text-gray-600">
            {[
              ["ผู้จัดทำ", site.name, thaiDate(issued)],
              ["ลูกค้า", order.customerName, ""],
            ].map(([role, org, date]) => (
              <div key={role}>
                <div className="relative mx-auto h-12 w-56 border-b border-gray-400">
                  {role === "ผู้จัดทำ" && (
                    <Image src={signature} alt="ลายเซ็นผู้จัดทำ" className="absolute bottom-[-3px] left-1/2 h-[68px] w-auto -translate-x-1/2" />
                  )}
                </div>
                <p className="mt-2 font-semibold text-gray-800">{role}</p>
                <p className="text-gray-400">{org}</p>
                <p className="mt-2">วันที่ {date || "......../......../........"}</p>
              </div>
            ))}
          </div>
        </div>

        <footer className="border-t-4 border-accent-400 bg-gray-50 px-10 py-3 text-center text-[11px] text-gray-500">
          ขอบคุณที่ไว้วางใจ {site.name} — นำเข้าสินค้าจากจีน ครบจบในที่เดียว · LINE {site.lineId} · {site.url.replace("https://", "")}
        </footer>
      </article>
    </div>
  );
}
