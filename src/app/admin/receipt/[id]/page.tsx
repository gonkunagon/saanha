import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import signature from "@/assets/signature.png";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { site } from "@/config/site";
import { customerGoodsOf, customerPaidRateOf, customerShippingOf, customerTotalOf, formatMoney, orderBalance, paidOf, toThb } from "@/lib/money";
import { amountInThaiWords } from "@/lib/thaiText";
import { shippingCostOf } from "@/lib/shipping";
import { LogoMark } from "@/components/Logo";
import { PrintButton } from "../../quote/[id]/PrintButton";
import { A4Fit } from "@/components/admin/A4Fit";

// ใบเสร็จรับเงิน (หน้าพิมพ์ A4 · ไม่ใช่เอกสารทางภาษี: ไม่แสดงที่อยู่ / เลขผู้เสียภาษีของลูกค้า) แบบเดียวกับใบสรุปค่าขนส่ง) — ออกได้เมื่อลูกค้าชำระครบแล้ว
// ออเดอร์สั่งซื้อ: ค่าสินค้า + ค่าขนส่งในจีน + ค่าขนส่งจีน–ไทย (คิว × เรท ของแต่ละตู้ ตามบิลค่าขนส่ง) · ออเดอร์ฝากส่ง: ค่าขนส่งที่กรอกในหน้าออเดอร์

const thaiDate = (d: Date) => d.toLocaleDateString("th-TH", { timeZone: "Asia/Bangkok", dateStyle: "long" });
const num = (n: number | null) => (n == null ? "-" : n.toLocaleString("th-TH"));

export default async function ReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;
  const order = await db.query.orders.findFirst({
    where: eq(orders.id, Number(id)),
    with: { customer: true, items: { with: { container: true } }, payments: true },
  });
  if (!order) notFound();

  const total = customerTotalOf(order);
  const balance = orderBalance(order, order.payments);
  const received = order.payments.filter((p) => p.direction !== "out").sort((a, b) => a.paidAt.getTime() - b.paidAt.getTime());
  const paid = paidOf(order, order.payments);
  const fullyPaid = total != null && balance != null && balance <= 0 && (paid ?? 0) > 0;

  const c = order.customer;
  const fullName = c && [c.firstName, c.lastName].filter(Boolean).join(" ");
  const cur = order.currency;
  // วันที่ในใบเสร็จ = วันที่ลูกค้าชำระครั้งสุดท้าย (ไม่มีรายการ = วันนี้)
  const issued = received.at(-1)?.paidAt ?? new Date();
  // ออเดอร์หยวน: แสดงยอดเป็นบาทด้วย (เรทคิดลูกค้า หรือเรทเฉลี่ยจากเงินที่รับ)
  const rate = order.orderRate ?? customerPaidRateOf(order.payments);
  const totalThb = cur === "CNY" ? toThb(total, rate, cur) : total;
  const receivedThb = received.reduce((s, p) => s + (p.currency === "THB" ? p.amount : 0), 0);

  // รายการในใบเสร็จ: สินค้าแต่ละรายการ (มีราคาขายครบ = แยกยอดทีละรายการ · ไม่ครบ = รวมเป็นบรรทัดค่าสินค้า มีชื่อสินค้าใต้บรรทัด)
  type Line = { label: string; sub?: string[]; qty?: number | null; unit?: number | null; amount: number | null };
  const r2 = (n: number) => Math.round(n * 100) / 100;
  const itemName = (i: (typeof order.items)[number]) => `${i.description}${i.quantity ? ` × ${num(i.quantity)}` : ""}`;
  const lines: Line[] = [];
  if (order.shippingOnly) {
    lines.push({ label: "ค่าขนส่ง", amount: order.shippingCharge ?? 0 });
  } else {
    const goods = customerGoodsOf(order) ?? 0;
    const priced = order.items.length > 0 && order.items.every((i) => i.sellPrice != null);
    if (priced) {
      for (const i of order.items) lines.push({ label: i.description, qty: i.quantity, unit: i.sellPrice, amount: r2(i.sellPrice! * (i.quantity ?? 1)) });
      const diff = r2(goods - lines.reduce((s, l) => s + (l.amount ?? 0), 0));
      if (Math.abs(diff) >= 0.01) lines.push({ label: "ค่าดำเนินการ", amount: diff });
    } else if (order.items.length === 1) {
      // สินค้ารายการเดียว ไม่มีราคาขาย = ยอดค่าสินค้าทั้งหมดอยู่ที่รายการนี้
      const i = order.items[0];
      lines.push({ label: i.description, qty: i.quantity, amount: goods });
    } else {
      // หลายรายการ ไม่มีราคาขาย = แสดงทุกรายการ (จำนวน) แล้วรวมยอดค่าสินค้าในบรรทัดเดียว
      for (const i of order.items) lines.push({ label: i.description, qty: i.quantity, amount: null });
      lines.push({ label: "ค่าสินค้ารวม", amount: goods });
    }
    const chinaShip = customerShippingOf(order) ?? 0;
    if (chinaShip > 0) lines.push({ label: "ค่าขนส่งภายในจีน", amount: chinaShip });
  }
  const money = (n: number) => n.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // ค่าขนส่งจีน–ไทย (บาท) ของออเดอร์สั่งซื้อ: รวมทุกตู้เป็นบรรทัดเดียว "ค่าขนส่ง" — ยอดเดียวกับใบสรุปค่าขนส่ง
  const shipLines: Line[] = [];
  if (!order.shippingOnly) {
    const boxed = order.items.filter((i) => i.containerId);
    const amount = shippingCostOf(boxed, order.shippingRate);
    if (amount > 0) shipLines.push({ label: "ค่าขนส่ง", amount });
  }
  const shipTotal = r2(shipLines.reduce((s, l) => s + (l.amount ?? 0), 0));

  // ยอดค่าสินค้าในใบเสร็จ: ออเดอร์หยวน = เงินบาทที่รับจริง (มีค่าขนส่ง = คิดจากเรท เพราะเงินที่รับอาจรวมค่าขนส่งแล้ว) · ออเดอร์บาท = รวมเป็นเงิน
  const goodsGrand = cur === "CNY" ? (shipLines.length ? totalThb || receivedThb : receivedThb || totalThb) || 0 : (total ?? 0);
  const grand = r2(goodsGrand + shipTotal);
  const grandCur = cur === "CNY" ? "THB" : cur;
  // ออเดอร์หยวน: แปลงทุกบรรทัดเป็นบาท ตามสัดส่วนเงินบาทที่ลูกค้าโอนจริง (ไม่แสดงเรท / หยวน) — บรรทัดสุดท้ายรับเศษให้รวมตรงกับยอดที่โอน
  if (cur === "CNY" && total) {
    const k = goodsGrand / total;
    for (const l of lines) {
      if (l.unit != null) l.unit = r2(l.unit * k);
      if (l.amount != null) l.amount = r2(l.amount * k);
    }
    const last = [...lines].reverse().find((l) => l.amount != null);
    if (last) last.amount = r2(last.amount! + goodsGrand - lines.reduce((s, l) => s + (l.amount ?? 0), 0));
  }
  lines.push(...shipLines);
  // ช่องทางชำระที่ใช้จริง → ติ๊กในช่องการชำระเงิน
  const used = received.map((p) => p.method);
  const payBoxes: [string, boolean][] = [
    ["เงินสด", used.some((m) => m.includes("เงินสด"))],
    ["โอนผ่านบัญชี / พร้อมเพย์", used.some((m) => m.includes("โอน") || m.includes("พร้อมเพย์"))],
    ["อื่นๆ (Alipay / WeChat Pay)", used.some((m) => /Alipay|WeChat|อื่น/.test(m))],
  ];
  const blankRows = Math.max(0, 8 - lines.length); // ให้ตารางสูงเท่ากันทุกใบ

  const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="flex gap-3">
      <dt className="w-[5.5rem] shrink-0 text-gray-500">{label}</dt>
      <dd className="min-w-0 flex-1 font-medium text-gray-900">{children || "-"}</dd>
    </div>
  );

  return (
    <div className="mx-auto max-w-[calc(210mm+2rem)] px-4 py-6 print:p-0">
      <div className="mb-4 flex items-center justify-between print:hidden">
        <Link href={`/admin/orders/${order.id}`} className="text-sm text-gray-500 hover:underline">← กลับไปหน้าออเดอร์</Link>
        <PrintButton />
        <A4Fit />
      </div>
      {!fullyPaid && (
        <p className="mb-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900 ring-1 ring-amber-200 print:hidden">
          ⚠️ ออเดอร์นี้ยังชำระไม่ครบ (ค้าง {formatMoney(balance, cur)}) — ตรวจสอบรายการรับเงินก่อนออกใบเสร็จ
        </p>
      )}

      <article className="a4 flex min-h-[297mm] flex-col bg-white px-10 pt-10 pb-8 text-[12px] text-gray-800 shadow-lg ring-1 ring-gray-200 [print-color-adjust:exact] print:min-h-0 print:shadow-none print:ring-0">
        {/* หัวใบ */}
        <header className="flex items-start justify-between">
          <div>
            <h1 className="text-[34px] leading-[1.25] font-bold text-gray-900">ใบเสร็จรับเงิน</h1>
            <p className="text-[20px] leading-tight font-semibold text-gray-700">Receipt</p>
          </div>
          <div className="flex items-center gap-2">
            <LogoMark className="h-11 w-11 text-navy-700" />
            <span className="font-logo text-xl font-extrabold tracking-tight text-gray-900">{site.name}</span>
          </div>
        </header>

        {/* ลูกค้า + เลขที่ / วันที่ */}
        <section className="mt-6 grid grid-cols-[1fr_17rem] gap-6 border-y border-gray-800 py-4">
          <dl className="space-y-1">
            <Row label="ชื่อลูกค้า">{order.customerName}</Row>
            <Row label="เบอร์โทรศัพท์">{order.customerPhone}</Row>
            {/* ผู้ติดต่อ = ชื่อจริง นามสกุล ในข้อมูลลูกค้า (ไม่มี = ชื่อที่ใช้เรียก) */}
            <Row label="ผู้ติดต่อ">{fullName || order.customerName}</Row>
          </dl>
          <dl className="space-y-1">
            <Row label="เลขที่">{`RE-${order.code}`}</Row>
            <Row label="วันที่">{thaiDate(issued)}</Row>
            <Row label="อ้างอิง">{order.code}</Row>
            {order.purchaseOrderNo && <Row label="เลขคำสั่งซื้อ"><span className="break-all">{order.purchaseOrderNo}</span></Row>}
          </dl>
        </section>

        {/* ผู้ออก */}
        <section className="grid grid-cols-[1fr_17rem] gap-6 border-b border-gray-800 py-4">
          <dl className="space-y-1">
            <Row label="ผู้ออก">{site.name}</Row>
            {site.showAddress && <Row label="ที่อยู่">{site.address.th}</Row>}
          </dl>
          <dl className="space-y-1">
            <Row label="เบอร์โทร">{site.phone}</Row>
            <Row label="LINE">{site.lineId}</Row>
            {site.showEmail && <Row label="อีเมล">{site.email}</Row>}
          </dl>
        </section>

        {/* ตารางรายการ + ยอดรวม */}
        <section className="mt-6 overflow-hidden rounded-xl border-2 border-gray-800">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="border-b border-gray-800 text-[12px] [&>th]:px-4 [&>th]:py-2 [&>th]:font-semibold">
                <th className="w-16 text-left">ลำดับ</th>
                <th className="text-center">รายการสินค้า</th>
                <th className="w-20 text-right">จำนวน</th>
                <th className="w-28 text-right">ราคา/หน่วย</th>
                <th className="w-32 text-right">ราคารวม</th>
              </tr>
            </thead>
            <tbody className="[&>tr>td]:px-4 [&>tr>td]:py-1.5 [&>tr>td]:align-top">
              <tr><td colSpan={5} className="!py-1" /></tr>
              {lines.map((l, n) => (
                <tr key={n}>
                  <td>{n + 1}</td>
                  <td>
                    <p className="font-medium text-gray-900">{l.label}</p>
                    {l.sub?.map((s, k) => <p key={k} className="text-[12px] text-gray-500">• {s}</p>)}
                  </td>
                  <td className="text-right">{l.qty != null ? num(l.qty) : ""}</td>
                  <td className="text-right">{l.unit != null ? money(l.unit) : ""}</td>
                  <td className="text-right">{l.amount != null ? money(l.amount) : ""}</td>
                </tr>
              ))}
              {Array.from({ length: blankRows }, (_, k) => (
                <tr key={`b${k}`}><td colSpan={5}>&nbsp;</td></tr>
              ))}
            </tbody>
          </table>

          <div className="grid grid-cols-[1fr_17rem] border-t-2 border-gray-800 px-4 py-3">
            <div>
              <p className="font-semibold">หมายเหตุ</p>
            </div>
            <dl className="space-y-1 text-[12px]">
              <div className="flex justify-between"><dt>ราคารวม</dt><dd>{formatMoney(grand, grandCur)}</dd></div>
              <div className="flex justify-between"><dt>ส่วนลด</dt><dd>0.00</dd></div>
            </dl>
          </div>

          <div className="flex items-center justify-between border-t-2 border-gray-800 px-4 py-4">
            <p className="text-[13px] font-semibold">จำนวนเงินรวมทั้งสิ้น</p>
            <div className="text-right">
              <p className="text-[14px] font-bold text-gray-900">{formatMoney(grand, grandCur)}</p>
              <p className="text-[12px] text-gray-700">({amountInThaiWords(grand, grandCur)})</p>
            </div>
          </div>
        </section>

        {/* การชำระเงิน + หมายเหตุ */}
        <section className="mt-6 grid grid-cols-2 gap-8 border-b border-gray-800 pb-5">
          <div>
            <p className="mb-2 text-[13px] font-semibold">การชำระเงิน</p>
            <ul className="space-y-1">
              {payBoxes.map(([label, on]) => (
                <li key={label} className="flex items-center gap-2">
                  <span className={`flex h-4 w-4 items-center justify-center rounded-full border-2 border-gray-800 text-[10px] leading-none ${on ? "bg-gray-800 text-white" : ""}`}>
                    {on ? "✓" : ""}
                  </span>
                  {label}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ลายเซ็น */}
        <div className="mt-auto grid grid-cols-2 gap-10 pt-14 text-center text-[12px] text-gray-600">
          {[
            ["อนุมัติโดย", site.name, thaiDate(issued), true],
            ["รับชำระ", site.name, thaiDate(issued), false],
          ].map(([role, , date, sign]) => (
            <div key={String(role)}>
              <div className="relative mx-auto flex h-12 w-64 items-end justify-center border-b border-dotted border-gray-500">
                {sign && <Image src={signature} alt="ลายเซ็น" className="absolute bottom-[-3px] left-1/2 h-[68px] w-auto -translate-x-1/2" />}
              </div>
              <p className="mt-1 font-semibold text-gray-800">{role}</p>
              <p className="mt-2">วันที่ {date}</p>
            </div>
          ))}
        </div>
      </article>
    </div>
  );
}
