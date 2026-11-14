import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import signature from "@/assets/signature.png";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { site } from "@/config/site";
import { currencyLabel, customerGoodsOf, customerPaidRateOf, customerShippingOf, customerTotalOf, formatMoney, orderBalance, paidOf, toThb } from "@/lib/money";
import { amountInThaiWords } from "@/lib/thaiText";
import { PrintButton } from "../../quote/[id]/PrintButton";

// ใบเสร็จรับเงิน (หน้าพิมพ์ A4 แบบเดียวกับใบสรุปค่าขนส่ง) — ออกได้เมื่อลูกค้าชำระครบแล้ว
// ออเดอร์สั่งซื้อ: ค่าสินค้า + ค่าขนส่งในจีน · ออเดอร์ฝากส่ง: ค่าขนส่งที่กรอกในหน้าออเดอร์

const thaiDate = (d: Date) => d.toLocaleDateString("th-TH", { timeZone: "Asia/Bangkok", dateStyle: "long" });
const num = (n: number | null) => (n == null ? "-" : n.toLocaleString("th-TH"));

function InfoBox({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-lg border border-gray-200">
      <p className="bg-gray-50 px-4 py-1.5 text-[11px] font-semibold tracking-wide text-brand-700 uppercase">{title}</p>
      <div className="space-y-0.5 px-4 py-3 leading-6">{children}</div>
    </div>
  );
}

export default async function ReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;
  const order = await db.query.orders.findFirst({
    where: eq(orders.id, Number(id)),
    with: { customer: true, items: true, payments: true },
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
    lines.push({ label: "ค่าขนส่งสินค้า จีน – ไทย (ฝากส่ง)", sub: order.items.map(itemName), amount: order.shippingCharge ?? 0 });
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

  const meta = [
    ["เลขที่ใบเสร็จ / No.", `RE-${order.code}`],
    ["วันที่ / Date", thaiDate(issued)],
    ["อ้างอิงออเดอร์ / Ref.", order.code],
    ["สถานะ / Status", fullyPaid ? "ชำระครบแล้ว" : "ยังชำระไม่ครบ"],
  ];

  return (
    <div className="mx-auto max-w-[210mm] px-4 py-6 print:p-0">
      <div className="mb-4 flex items-center justify-between print:hidden">
        <Link href={`/admin/orders/${order.id}`} className="text-sm text-gray-500 hover:underline">← กลับไปหน้าออเดอร์</Link>
        <PrintButton />
      </div>
      {!fullyPaid && (
        <p className="mb-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900 ring-1 ring-amber-200 print:hidden">
          ⚠️ ออเดอร์นี้ยังชำระไม่ครบ (ค้าง {formatMoney(balance, cur)}) — ตรวจสอบรายการรับเงินก่อนออกใบเสร็จ
        </p>
      )}

      <article className="flex min-h-[297mm] flex-col bg-white text-[13px] text-gray-800 shadow-lg ring-1 ring-gray-200 [print-color-adjust:exact] print:min-h-0 print:shadow-none print:ring-0">
        <header className="border-b-4 border-accent-400 bg-white px-10 pt-9 pb-6">
          <p className="text-[11px] font-semibold tracking-[0.3em] text-brand-600">RECEIPT</p>
          <h1 className="mt-1 text-[34px] leading-[1.5] font-bold text-brand-700">ใบเสร็จรับเงิน</h1>
        </header>

        <div className="flex flex-1 flex-col px-10 pt-7 pb-8">
          <dl className="grid grid-cols-4 divide-x divide-gray-200 rounded-lg border border-gray-200">
            {meta.map(([label, value]) => (
              <div key={label} className="px-4 py-2.5">
                <dt className="text-[10px] text-gray-500">{label}</dt>
                <dd className={`mt-0.5 font-semibold ${value === "ชำระครบแล้ว" ? "text-emerald-700" : "text-gray-900"}`}>{value}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-5 grid grid-cols-2 gap-5">
            <InfoBox title="ได้รับเงินจาก / Received from">
              <p className="text-[15px] font-semibold text-gray-900">{order.customerName}</p>
              {fullName && <p>{fullName}</p>}
              <p className="text-gray-600">เบอร์โทร: {order.customerPhone || "-"}</p>
              {order.customerLineId && <p className="text-gray-600">Line: {order.customerLineId}</p>}
            </InfoBox>
            <InfoBox title="รายละเอียด / Details">
              {order.purchaseOrderNo && (
                <p><span className="inline-block w-28 text-gray-500">เลขคำสั่งซื้อ</span>{order.purchaseOrderNo}</p>
              )}
              <p><span className="inline-block w-28 text-gray-500">จำนวนรายการ</span>{order.items.length} รายการ</p>
            </InfoBox>
          </div>

          {/* รายการที่รับชำระ */}
          <table className="mt-6 w-full border-separate border-spacing-0 text-[13px]">
            <thead>
              <tr className="text-brand-700 [&>th]:border-y-2 [&>th]:border-brand-600">
                <th className="w-12 rounded-l-lg border-l-2 px-3 py-2.5 text-center font-semibold">#</th>
                <th className="px-3 py-2.5 text-left font-semibold">รายการ / Description</th>
                <th className="w-20 px-3 py-2.5 text-right font-semibold">จำนวน</th>
                <th className="w-32 px-3 py-2.5 text-right font-semibold whitespace-nowrap">ราคา / หน่วย</th>
                <th className="w-40 rounded-r-lg border-r-2 px-3 py-2.5 text-right font-semibold">จำนวนเงิน ({currencyLabel[cur]})</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l, n) => (
                <tr key={n} className="align-top [&>td]:border-b [&>td]:border-gray-100">
                  <td className="px-3 py-2.5 text-center text-gray-500">{n + 1}</td>
                  <td className="px-3 py-2.5">
                    <p className="font-medium text-gray-900">{l.label}</p>
                    {l.sub?.map((s, k) => <p key={k} className="text-[12px] text-gray-500">• {s}</p>)}
                  </td>
                  <td className="px-3 py-2.5 text-right">{l.qty != null ? num(l.qty) : ""}</td>
                  <td className="px-3 py-2.5 text-right">{l.unit != null ? money(l.unit) : ""}</td>
                  <td className="px-3 py-2.5 text-right">{l.amount != null ? money(l.amount) : ""}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* ประวัติการรับเงิน */}
          {received.length > 0 && (
            <div className="mt-6">
              <p className="mb-1 text-[11px] font-semibold tracking-wide text-brand-700 uppercase">การชำระเงิน / Payments</p>
              <table className="w-full text-[12px]">
                <thead className="text-left text-gray-500">
                  <tr className="[&>th]:border-b [&>th]:border-gray-200 [&>th]:py-1.5 [&>th]:pr-3">
                    <th>วันที่ชำระ</th>
                    <th>ช่องทาง</th>
                    <th className="text-right">จำนวนเงิน</th>
                  </tr>
                </thead>
                <tbody>
                  {received.map((p) => (
                    <tr key={p.id} className="[&>td]:border-b [&>td]:border-gray-100 [&>td]:py-1.5 [&>td]:pr-3">
                      <td>{thaiDate(p.paidAt)}</td>
                      <td>{[p.method, p.bank].filter(Boolean).join(" · ")}</td>
                      <td className="text-right">{formatMoney(p.amount, p.currency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-6 grid grid-cols-[1fr_18rem] gap-6">
            <div className="rounded-lg border border-accent-400 bg-accent-300/15 px-4 py-3 self-start">
              <p className="text-[10px] text-gray-500">จำนวนเงิน (ตัวอักษร)</p>
              <p className="font-semibold text-gray-900">
                ({amountInThaiWords(cur === "CNY" && totalThb != null ? totalThb : (total ?? 0), cur === "CNY" && totalThb != null ? "THB" : cur)})
              </p>
            </div>
            <dl className="self-start overflow-hidden rounded-lg border-2 border-brand-600">
              <div className="flex justify-between px-4 py-2 text-[12px] text-gray-600">
                <dt>รวมเป็นเงิน</dt>
                <dd>{formatMoney(total, cur)}</dd>
              </div>
              {cur === "CNY" && rate != null && (
                <div className="flex justify-between border-t border-gray-100 px-4 py-2 text-[12px] text-gray-600">
                  <dt>เรท</dt>
                  <dd>{rate} บาท / หยวน</dd>
                </div>
              )}
              <div className="flex items-center justify-between border-t-2 border-brand-600 px-4 py-3.5 text-brand-700">
                <dt className="font-semibold">รับชำระแล้ว</dt>
                <dd className="text-lg font-bold">
                  {cur === "CNY" ? formatMoney(receivedThb || totalThb, "THB") : formatMoney(paid, cur)}
                </dd>
              </div>
            </dl>
          </div>

          <div className="mt-auto grid grid-cols-2 gap-10 pt-14 text-center text-[12px] text-gray-600">
            {[
              ["ผู้รับเงิน", site.name, thaiDate(issued)],
              ["ผู้ชำระเงิน", order.customerName, ""],
            ].map(([role, org, date]) => (
              <div key={role}>
                <div className="relative mx-auto h-12 w-56 border-b border-gray-400">
                  {role === "ผู้รับเงิน" && (
                    <Image src={signature} alt="ลายเซ็นผู้รับเงิน" className="absolute bottom-[-3px] left-1/2 h-[68px] w-auto -translate-x-1/2" />
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
