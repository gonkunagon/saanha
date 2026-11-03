import Image from "next/image";
import Link from "next/link";
import signature from "@/assets/signature.png";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { site } from "@/config/site";
import { currencyLabel, formatMoney, grandTotalOf } from "@/lib/money";
import { amountInThaiWords } from "@/lib/thaiText";
import { methodLabel } from "@/components/admin/ui";
import { LogoMark } from "@/components/Logo";
import { PrintButton } from "./PrintButton";
import { getQuoteRate } from "@/lib/settings";
import { RateBox } from "./RateBox";

// ใบเสนอราคาของออเดอร์ (หน้าพิมพ์ A4) — อยู่นอกเมนูหลังบ้าน จะได้พิมพ์ / บันทึก PDF ได้สะอาด
// เลขที่ใบเสนอราคา = QT-<เลขออเดอร์> · ยืนราคา 7 วันนับจากวันที่ออก
// ออเดอร์เงินหยวน: แปลงเป็นบาทด้วยเรทของวันนี้ (ตั้งที่กล่องด้านบน) และใช้ได้เฉพาะวันที่ออกใบ เพราะเรทเปลี่ยนทุกวัน

const VALID_DAYS = 7;
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

export default async function QuotePage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;
  const order = await db.query.orders.findFirst({
    where: eq(orders.id, Number(id)),
    with: { items: true, customer: true },
  });
  if (!order) notFound();

  const issued = new Date();
  const isCny = order.currency === "CNY";
  const validUntil = isCny ? issued : new Date(issued.getTime() + VALID_DAYS * 86_400_000);
  const q = isCny ? await getQuoteRate(issued) : null;
  const rate = q?.rate ?? null;
  const c = order.customer;
  const fullName = c && [c.firstName, c.lastName].filter(Boolean).join(" ");
  // ลูกค้าไม่เห็นค่าดำเนินการแยก: บวก % ค่าดำเนินการเข้าไปในราคาต่อหน่วยเลย
  const markup = 1 + order.handlingFeePct / 100;
  const round2 = (n: number) => Math.round(n * 100) / 100;
  // ราคาต่อหน่วย (ก่อนบวกค่าดำเนินการ): ใช้ราคาที่กรอกในรายการ
  // ถ้าไม่มีราคาเลยสักรายการ และออเดอร์มีสินค้ารายการเดียวที่รู้จำนวน → ยอดเต็ม ÷ จำนวน
  const anyPriced = order.items.some((i) => i.unitPrice != null);
  const baseUnitPrice = (i: (typeof order.items)[number]) =>
    i.unitPrice ??
    (!anyPriced && order.items.length === 1 && order.totalAmount != null && i.quantity ? order.totalAmount / i.quantity : null);
  const lines = order.items.map((i) => {
    const base = baseUnitPrice(i);
    const unit = base == null ? null : round2(base * markup);
    return { item: i, unit, amount: unit == null ? null : round2(unit * (i.quantity ?? 1)) };
  });
  const allPriced = lines.length > 0 && lines.every((l) => l.amount != null);
  // รวมเป็นเงินทั้งสิ้น = ผลรวมแต่ละรายการ (ตรงกับตาราง) · ถ้าบางรายการไม่มีราคา ใช้ยอดเต็มของออเดอร์ × (1 + %)
  const grandTotal = allPriced
    ? round2(lines.reduce((s, l) => s + l.amount!, 0))
    : grandTotalOf(order.totalAmount, order.handlingFeePct);
  // ยอดเงินบาท (เฉพาะออเดอร์หยวน และตั้งเรทของวันนี้แล้ว)
  const thbTotal = rate != null && grandTotal != null ? round2(grandTotal * rate) : null;

  const meta = [
    ["เลขที่ / No.", `QT-${order.code}`],
    ["วันที่ / Date", thaiDate(issued)],
    [isCny ? "ใช้ได้เฉพาะวันที่ / Valid on" : "ยืนราคาถึง / Valid until", thaiDate(validUntil)],
    ["อ้างอิงออเดอร์ / Ref.", order.code],
  ];

  return (
    <div className="mx-auto max-w-[210mm] px-4 py-6 print:p-0">
      <div className="mb-4 flex items-center justify-between print:hidden">
        <Link href={`/admin/orders/${order.id}`} className="text-sm text-gray-500 hover:underline">← กลับไปหน้าออเดอร์</Link>
        <PrintButton />
      </div>

      {q && <RateBox q={q} />}

      <article className="flex min-h-[297mm] flex-col bg-white text-[13px] text-gray-800 shadow-lg ring-1 ring-gray-200 [print-color-adjust:exact] print:min-h-0 print:shadow-none print:ring-0">
        {/* หัวกระดาษ */}
        <header className="mx-10 mt-8 flex items-stretch justify-between rounded-lg border-2 border-brand-600">
          <div className="flex items-center gap-4 px-6 py-5">
            <LogoMark className="h-14 w-14 shrink-0 text-navy-700" />
            <div>
              <p className="text-2xl font-extrabold tracking-tight text-gray-900">{site.name}</p>
              {site.showAddress && <p className="max-w-xs text-[11px] leading-5 text-gray-600">{site.address.th}</p>}
              <p className="text-[11px] text-gray-600">โทร: {site.phone}</p>
              <p className="text-[11px] text-gray-600">Line: {site.lineId}</p>
              {site.showEmail && <p className="text-[11px] text-gray-600">Email: {site.email}</p>}
            </div>
          </div>
          <div className="flex flex-col items-end justify-center border-l-2 border-brand-600 px-8">
            <h1 className="text-3xl font-bold text-brand-700">ใบเสนอราคา</h1>
            <p className="text-xs tracking-[0.3em] text-brand-600">QUOTATION</p>
          </div>
        </header>

        <div className="flex flex-1 flex-col px-10 py-8">
          {/* ข้อมูลเอกสาร */}
          <dl className="grid grid-cols-4 divide-x divide-gray-200 rounded-lg border border-gray-200">
            {meta.map(([label, value]) => (
              <div key={label} className="px-4 py-2.5">
                <dt className="text-[10px] text-gray-500">{label}</dt>
                <dd className="mt-0.5 font-semibold text-gray-900">{value}</dd>
              </div>
            ))}
          </dl>

          {/* ลูกค้า / รายละเอียด */}
          <div className="mt-5 grid grid-cols-2 gap-5">
            <InfoBox title="ลูกค้า / Customer">
              <p className="text-[15px] font-semibold text-gray-900">
                {order.customerName}
              </p>
              {fullName && <p>{fullName}</p>}
              {c?.address && <p className="whitespace-pre-line text-gray-600">{c.address}</p>}
              <p className="text-gray-600">เบอร์โทร: {order.customerPhone || "-"}</p>
              {order.customerLineId && <p className="text-gray-600">Line: {order.customerLineId}</p>}
            </InfoBox>
            <InfoBox title="รายละเอียดการสั่งซื้อ / Order details">
              <p><span className="inline-block w-28 text-gray-500">ร้านค้า</span>{order.shopName ?? "-"}</p>
              <p><span className="inline-block w-28 text-gray-500">เลขคำสั่งซื้อ</span>{order.purchaseOrderNo ?? "-"}</p>
              <p><span className="inline-block w-28 text-gray-500">วิธีขนส่ง</span>{methodLabel(order.method)}</p>
              <p><span className="inline-block w-28 text-gray-500">สกุลเงิน</span>{order.currency === "CNY" ? "หยวน (CNY)" : "บาท (THB)"}</p>
            </InfoBox>
          </div>

          {/* รายการสินค้า */}
          <table className="mt-6 w-full border-separate border-spacing-0 text-[13px]">
            <thead>
              <tr className="text-brand-700 [&>th]:border-y-2 [&>th]:border-brand-600">
                <th className="w-12 rounded-l-lg border-l-2 px-3 py-2.5 text-center font-semibold">#</th>
                <th className="px-3 py-2.5 text-left font-semibold">รายการสินค้า / Description</th>
                <th className="w-20 px-3 py-2.5 text-right font-semibold">จำนวน</th>
                <th className="w-32 px-3 py-2.5 text-right font-semibold whitespace-nowrap">ราคา/หน่วย ({currencyLabel[order.currency]})</th>
                <th className="w-32 rounded-r-lg border-r-2 px-3 py-2.5 text-right font-semibold whitespace-nowrap">จำนวนเงิน ({currencyLabel[order.currency]})</th>
              </tr>
            </thead>
            <tbody>
              {lines.map(({ item: i, unit, amount }, n) => (
                <tr key={i.id} className="[&>td]:border-b [&>td]:border-gray-100">
                  <td className="px-3 py-2.5 text-center text-gray-500">{n + 1}</td>
                  <td className="px-3 py-2.5 font-medium text-gray-900">{i.description}</td>
                  <td className="px-3 py-2.5 text-right">{num(i.quantity)}</td>
                  <td className="px-3 py-2.5 text-right">{num(unit, 2)}</td>
                  <td className="px-3 py-2.5 text-right font-medium">{num(amount, 2)}</td>
                </tr>
              ))}
              {order.items.length === 0 && (
                <tr><td colSpan={5} className="px-3 py-8 text-center text-gray-400">ยังไม่มีรายการสินค้า</td></tr>
              )}
            </tbody>
            {order.items.length > 0 && (
              <tfoot>
                <tr className="font-semibold [&>td]:border-t-2 [&>td]:border-brand-600">
                  <td className="px-3 py-2" />
                  <td className="px-3 py-2 text-gray-600">รวม {order.items.length} รายการ</td>
                  <td className="px-3 py-2 text-right">{num(order.items.reduce((s, i) => s + (i.quantity ?? 0), 0) || null)}</td>
                  <td className="px-3 py-2" />
                  <td className="px-3 py-2 text-right">{num(allPriced ? grandTotal : null, 2)}</td>
                </tr>
              </tfoot>
            )}
          </table>

          {/* ตัวหนังสือ + ยอดเงิน */}
          <div className="mt-6 grid grid-cols-[1fr_18rem] gap-6">
            <div className="space-y-4">
              {/* ตัวอักษรเป็นเงินบาทเสมอ: ออเดอร์หยวนใช้ยอดที่แปลงด้วยเรทวันนี้ (ยังไม่ตั้งเรท = แสดงคำเตือนบนจอ ไม่พิมพ์) */}
              {(isCny ? thbTotal : grandTotal) != null ? (
                <div className="rounded-lg border border-accent-400 bg-accent-300/15 px-4 py-3">
                  <p className="text-[10px] text-gray-500">รวมเป็นเงินบาท (ตัวอักษร)</p>
                  <p className="font-semibold text-gray-900">({amountInThaiWords((isCny ? thbTotal : grandTotal)!, "THB")})</p>
                </div>
              ) : (
                isCny &&
                grandTotal != null && (
                  <p className="rounded-lg bg-amber-50 px-4 py-3 text-xs text-amber-800 ring-1 ring-amber-300 print:hidden">
                    ⚠️ ยังไม่มีเรทหยวน — ตั้งเรทที่กล่องด้านบนก่อน ยอดเงินบาทและตัวอักษรจึงจะแสดง
                  </p>
                )
              )}
              <div>
                <p className="mb-1 text-[11px] font-semibold tracking-wide text-brand-700 uppercase">เงื่อนไข / Terms</p>
                <ol className="list-decimal space-y-0.5 pl-5 text-[12px] leading-5 text-gray-600">
                  {isCny ? (
                    <li>ใบเสนอราคานี้ใช้ได้เฉพาะวันที่ {thaiDate(validUntil)} เท่านั้น เนื่องจากอัตราแลกเปลี่ยนเงินหยวนเปลี่ยนแปลงทุกวัน</li>
                  ) : (
                    <li>ใบเสนอราคานี้ยืนราคาถึงวันที่ {thaiDate(validUntil)}</li>
                  )}
                  <li>ค่าขนส่งจีน–ไทยคิดตามน้ำหนักหรือปริมาตรจริงที่ชั่งวัด ณ โกดัง และจะแจ้งยืนยันก่อนชำระ</li>
                  <li>ไม่รวมค่าจัดส่งในประเทศ ค่าตีลังไม้ และค่าประกันสินค้า (ถ้ามี)</li>
                  {order.note && <li>{order.note}</li>}
                </ol>
              </div>
            </div>
            {/* ค่าดำเนินการรวมอยู่ในราคาสินค้าแล้ว จึงแสดงแค่ยอดรวมทั้งสิ้น */}
            <dl className="self-start overflow-hidden rounded-lg border-2 border-brand-600">
              <div className="flex items-center justify-between px-4 py-3.5 text-brand-700">
                <dt className="font-semibold">รวมเป็นเงินทั้งสิ้น</dt>
                <dd className="text-lg font-bold">{formatMoney(grandTotal, order.currency)}</dd>
              </div>
              {isCny && rate != null && (
                <>
                  <div className="flex justify-between border-t border-gray-100 px-4 py-2 text-[12px] text-gray-600">
                    <dt>อัตราแลกเปลี่ยน</dt>
                    <dd>1 หยวน = {rate.toLocaleString("th-TH", { maximumFractionDigits: 4 })} บาท</dd>
                  </div>
                  <div className="flex items-center justify-between border-t-2 border-brand-600 px-4 py-3.5 text-brand-700">
                    <dt className="font-semibold">คิดเป็นเงินบาท</dt>
                    <dd className="text-lg font-bold">{formatMoney(thbTotal, "THB")}</dd>
                  </div>
                </>
              )}
            </dl>
          </div>

          {/* ลายเซ็น */}
          <div className="mt-auto grid grid-cols-2 gap-10 pt-14 text-center text-[12px] text-gray-600">
            {[
              // ฝั่งร้านใส่วันที่ออกใบให้อัตโนมัติ · ฝั่งลูกค้าเว้นให้เขียนเอง
              ["ผู้เสนอราคา", "", site.name, thaiDate(issued)],
              ["ผู้อนุมัติ / ลูกค้า", "(.................................................)", order.customerName, ""],
            ].map(([role, name, org, date]) => (
              <div key={role}>
                <div className="relative mx-auto h-12 w-56 border-b border-gray-400">
                  {/* ลายเซ็นของร้าน ทับเส้นเซ็นชื่อเล็กน้อยให้ดูเหมือนเซ็นจริง */}
                  {role === "ผู้เสนอราคา" && (
                    <Image src={signature} alt="ลายเซ็นผู้เสนอราคา" className="absolute bottom-[-3px] left-1/2 h-[68px] w-auto -translate-x-1/2" />
                  )}
                </div>
                <p className="mt-2 font-semibold text-gray-800">{role}</p>
                {name && <p>{name}</p>}
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
