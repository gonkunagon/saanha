import Image from "next/image";
import Link from "next/link";
import signature from "@/assets/signature.png";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { site } from "@/config/site";
import { currencyLabel, customerGoodsOf, customerShippingOf, formatMoney } from "@/lib/money";
import { amountInThaiWords } from "@/lib/thaiText";
import { methodLabel } from "@/components/admin/ui";
import { LogoMark } from "@/components/Logo";
import { PrintButton } from "./PrintButton";
import { getQuoteRate, sameBangkokDay } from "@/lib/settings";
import { RateBox } from "./RateBox";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { reissueQuote } from "./actions";

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
    with: { items: { with: { images: { columns: { id: true } } } }, customer: true },
  });
  if (!order) notFound();

  // วันเปิดบิล = วันที่สร้างออเดอร์ (หรือวันที่กด "ออกใบใหม่เป็นวันนี้" = quotedAt)
  // ภายในวันเปิดบิล เรทหยวนยังปรับได้ (เก็บเรทล่าสุดไว้) · พ้นวันแล้วใบคงที่: วันเดิม เรทเดิม (ไม่มีเรทที่เก็บไว้ = ใช้เรทตอนสั่งซื้อ)
  const now = new Date();
  const isCny = order.currency === "CNY";
  const issued = order.quotedAt ?? order.createdAt;
  const issuedToday = sameBangkokDay(issued, now);
  // กรอกเรทตอนสร้างออเดอร์แล้ว = ใช้เรทนั้นในใบเลย (แก้ที่หน้าแก้ไขออเดอร์) · ไม่กรอก = ใช้เรทของวันนี้ตามเดิม
  const fromOrder = isCny && order.orderRate != null;
  const q = isCny && issuedToday && !fromOrder ? await getQuoteRate(now) : null;
  const rate = isCny ? (fromOrder ? order.orderRate : issuedToday ? q?.rate ?? null : order.quoteRate) : null;
  if (isCny && issuedToday && !fromOrder && rate != null && order.quoteRate !== rate) {
    // ไม่นับเป็นการแก้ไขออเดอร์ (คง updatedAt เดิม)
    await db.update(orders).set({ quoteRate: rate, updatedAt: order.updatedAt }).where(eq(orders.id, order.id));
  }
  const locked = !issuedToday;
  const validUntil = isCny ? issued : new Date(issued.getTime() + VALID_DAYS * 86_400_000);
  const c = order.customer;
  const fullName = c && [c.firstName, c.lastName].filter(Boolean).join(" ");
  // ราคาลูกค้า: กรอกค่าสินค้าที่คิดลูกค้าไว้ = ปรับราคาต่อหน่วยตามสัดส่วน (ราคาลูกค้า ÷ ค่าสินค้าที่จ่ายร้าน)
  // ออเดอร์เก่า = บวก % ค่าดำเนินการเข้าไปในราคาต่อหน่วย (ลูกค้าไม่เห็นค่าดำเนินการแยก)
  const markup =
    order.customerGoodsAmount != null && order.totalAmount ? order.customerGoodsAmount / order.totalAmount : 1 + order.handlingFeePct / 100;
  const round2 = (n: number) => Math.round(n * 100) / 100;
  // ราคาต่อหน่วย (ก่อนบวกค่าดำเนินการ): ใช้ราคาที่กรอกในรายการ
  // ถ้าไม่มีราคาเลยสักรายการ และออเดอร์มีสินค้ารายการเดียวที่รู้จำนวน → ยอดเต็ม ÷ จำนวน
  const anyPriced = order.items.some((i) => i.unitPrice != null);
  const baseUnitPrice = (i: (typeof order.items)[number]) =>
    i.unitPrice ??
    (!anyPriced && order.items.length === 1 && order.totalAmount != null && i.quantity ? order.totalAmount / i.quantity : null) ??
    // ไม่มีค่าสินค้าที่จ่ายร้าน แต่มีราคาลูกค้า + สินค้ารายการเดียว → ราคาลูกค้า ÷ จำนวน (markup = 1)
    (order.items.length === 1 && order.totalAmount == null && order.customerGoodsAmount != null && i.quantity ? order.customerGoodsAmount / i.quantity : null);
  const lines = order.items.map((i) => {
    const base = baseUnitPrice(i);
    const unit = base == null ? null : round2(base * markup);
    return { item: i, unit, amount: unit == null ? null : round2(unit * (i.quantity ?? 1)) };
  });
  const allPriced = lines.length > 0 && lines.every((l) => l.amount != null);
  // รวมเป็นเงินทั้งสิ้น = ผลรวมแต่ละรายการ (ตรงกับตาราง) · ถ้าบางรายการไม่มีราคา ใช้ยอดเต็มของออเดอร์ × (1 + %)
  const itemsTotal = allPriced ? round2(lines.reduce((s, l) => s + l.amount!, 0)) : customerGoodsOf(order);
  // ค่าขนส่งภายในจีนที่คิดลูกค้า แสดงแยกบรรทัด แล้วบวกเข้ารวมเป็นเงินทั้งสิ้น
  const chinaShip = customerShippingOf(order) ?? 0;
  const grandTotal = itemsTotal == null ? null : round2(itemsTotal + chinaShip);
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
        <Link href="/admin/orders" className="text-sm text-gray-500 hover:underline">← กลับไปหน้าออเดอร์</Link>
        <PrintButton />
      </div>

      {q && <RateBox q={q} />}
      {fromOrder && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-900 ring-1 ring-emerald-200 print:hidden">
          <span>
            เรทที่ใช้ในใบเสนอราคา: <b>1 หยวน = {rate} บาท</b> (เรทที่กรอกในออเดอร์)
          </span>
          <Link href={`/admin/orders/${order.id}?edit=1`} className="font-medium text-brand-600 hover:underline">แก้เรทที่หน้าออเดอร์</Link>
        </div>
      )}
      {locked && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900 print:hidden">
          <span>
            ใบนี้เปิดบิลเมื่อ <b>{thaiDate(issued)}</b>
            {rate != null && <> · เรท {rate} บาท / หยวน</>} — วันที่และเรทล็อกไว้เป็นประวัติ
          </span>
          <form action={reissueQuote}>
            <input type="hidden" name="orderId" value={order.id} />
            <ConfirmButton
              message={`ออกใบเสนอราคาใหม่เป็นวันนี้${isCny && !fromOrder ? " (ใช้เรทวันนี้)" : ""}? วันเปิดบิลเดิม ${thaiDate(issued)} จะถูกแทนที่`}
              className="rounded-lg border border-amber-400 bg-white px-3 py-1.5 text-sm font-medium hover:bg-amber-100"
            >
              ออกใบใหม่เป็นวันนี้
            </ConfirmButton>
          </form>
        </div>
      )}

      <article className="flex min-h-[297mm] flex-col bg-white text-[13px] text-gray-800 shadow-lg ring-1 ring-gray-200 [print-color-adjust:exact] print:min-h-0 print:shadow-none print:ring-0">
        {/* หัวกระดาษ */}
        <header className="mx-10 mt-8 flex items-stretch justify-between rounded-lg border-2 border-brand-600">
          <div className="flex items-center gap-4 px-6 py-5">
            <LogoMark className="h-14 w-14 shrink-0 text-navy-700" />
            <div>
              <p className="font-logo text-2xl font-extrabold tracking-tight text-gray-900">{site.name}</p>
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
              {/* ร้านที่เราหามาเอง: แสดงแค่หัวข้อ "ร้านค้า" ไม่แสดงชื่อร้าน (ตั้งในออเดอร์) · Platform เป็นข้อมูลภายใน ไม่แสดงเลย */}
              <p><span className="inline-block w-28 text-gray-500">ร้านค้า</span>{order.hideShopOnQuote ? "" : order.shopName ?? "-"}</p>
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
                  <td className="px-3 py-2 text-right">{num(allPriced ? itemsTotal : null, 2)}</td>
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
              {chinaShip > 0 && (
                <>
                  <div className="flex justify-between px-4 py-2 text-[12px] text-gray-600">
                    <dt>ค่าสินค้า</dt>
                    <dd>{formatMoney(itemsTotal, order.currency)}</dd>
                  </div>
                  <div className="flex justify-between border-t border-gray-100 px-4 py-2 text-[12px] text-gray-600">
                    <dt>ค่าขนส่งภายในจีน</dt>
                    <dd>{formatMoney(chinaShip, order.currency)}</dd>
                  </div>
                </>
              )}
              <div className={`flex items-center justify-between px-4 py-3.5 text-brand-700 ${chinaShip > 0 ? "border-t-2 border-brand-600" : ""}`}>
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

      {/* หน้า 2: รายละเอียดสินค้า (ชื่อ จำนวน ขนาด/รายละเอียด รูป) ให้ลูกค้าตรวจและเซ็นยืนยัน — พิมพ์ขึ้นหน้าใหม่เสมอ */}
      {order.items.length > 0 && (
        <article className="mt-6 flex min-h-[297mm] break-before-page flex-col bg-white text-[13px] text-gray-800 shadow-lg ring-1 ring-gray-200 [print-color-adjust:exact] print:mt-0 print:min-h-0 print:shadow-none print:ring-0">
          <header className="mx-10 mt-8 flex items-center justify-between rounded-lg border-2 border-brand-600 px-6 py-4">
            <div className="flex items-center gap-3">
              <LogoMark className="h-10 w-10 shrink-0 text-navy-700" />
              <span className="font-logo text-xl font-extrabold tracking-tight text-gray-900">{site.name}</span>
            </div>
            <div className="text-right">
              <h2 className="text-2xl font-bold text-brand-700">รายละเอียดสินค้า</h2>
              <p className="text-[11px] tracking-[0.25em] text-brand-600">PRODUCT DETAILS</p>
              <p className="mt-1 text-xs text-gray-500">แนบท้ายใบเสนอราคาเลขที่ QT-{order.code} · {thaiDate(issued)}</p>
            </div>
          </header>

          <div className="flex flex-1 flex-col px-10 py-6">
            <ol className="space-y-4">
              {order.items.map((i, n) => (
                <li key={i.id} className="break-inside-avoid overflow-hidden rounded-lg border border-gray-200">
                  <div className="flex items-baseline gap-3 border-b border-gray-100 bg-gray-50 px-4 py-2">
                    <span className="text-gray-500">{n + 1}.</span>
                    <span className="flex-1 text-[15px] font-semibold text-gray-900">{i.description}</span>
                    <span className="text-gray-600">จำนวน {num(i.quantity)}</span>
                  </div>
                  <div className="space-y-3 px-4 py-3">
                    <div>
                      <p className="text-[11px] font-semibold tracking-wide text-brand-700 uppercase">รายละเอียด / ขนาด</p>
                      <p className="whitespace-pre-line">{i.spec || "-"}</p>
                    </div>
                    {i.images.length > 0 && (
                      <div className="grid grid-cols-3 gap-2">
                        {i.images.map((img) => (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img key={img.id} src={`/admin/item-image/${img.id}`} alt={i.description} className="h-44 w-full rounded border border-gray-100 bg-white object-contain" />
                        ))}
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ol>

            {/* ลูกค้าเซ็นยืนยันว่ารายละเอียดถูกต้อง */}
            <div className="mt-auto break-inside-avoid pt-8">
              <p className="rounded-lg border border-accent-400 bg-accent-300/15 px-4 py-3 leading-6">
                ข้าพเจ้าได้ตรวจสอบชื่อสินค้า จำนวน รายละเอียด ขนาด และรูปภาพสินค้าข้างต้นแล้ว
                <b> ถูกต้องตามที่ต้องการ</b> และยืนยันให้ {site.name} ดำเนินการสั่งซื้อตามรายละเอียดนี้
              </p>
              <div className="mt-12 grid grid-cols-2 gap-10 text-center text-[12px] text-gray-600">
                <div />
                <div>
                  <div className="mx-auto h-12 w-56 border-b border-gray-400" />
                  <p className="mt-2 font-semibold text-gray-800">ผู้อนุมัติ / ลูกค้า</p>
                  <p>(.................................................)</p>
                  <p className="text-gray-400">{order.customerName}</p>
                  <p className="mt-2">วันที่ ......../......../........</p>
                </div>
              </div>
            </div>
          </div>

          <footer className="border-t-4 border-accent-400 bg-gray-50 px-10 py-3 text-center text-[11px] text-gray-500">
            {site.name} · LINE {site.lineId} · {site.url.replace("https://", "")}
          </footer>
        </article>
      )}
    </div>
  );
}
