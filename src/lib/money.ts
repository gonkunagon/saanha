// ยอดเงินของคำสั่งซื้อ (ใช้ได้ทั้งฝั่งเซิร์ฟเวอร์และหน้าเว็บ)

export const currencyLabel = { THB: "บาท", CNY: "หยวน" } as const;
export type CurrencyCode = keyof typeof currencyLabel;

// ยอดค้างชำระ = ยอดเต็ม − มัดจำ (ไม่มียอดเต็ม = ไม่รู้ยอดค้าง)
export function balanceOf(total: number | null | undefined, deposit: number | null | undefined): number | null {
  if (total == null) return null;
  return Math.round((total - (deposit ?? 0)) * 100) / 100;
}

export function formatMoney(n: number | null | undefined, currency: CurrencyCode = "THB"): string {
  if (n == null) return "-";
  return `${n.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currencyLabel[currency]}`;
}

// ค่าดำเนินการของร้าน = % ของยอดรวมค่าสินค้า (เลือกได้ 0–8%) · รวมเป็นเงินทั้งสิ้น = ค่าสินค้า + ค่าดำเนินการ
export const handlingFeeOptions = [0, 1, 2, 3, 4, 5, 6, 7, 8] as const;
export const clampHandlingPct = (v: unknown) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.min(8, Math.max(0, n)) : 5;
};
export function handlingFeeOf(goodsTotal: number | null | undefined, pct: number): number | null {
  if (goodsTotal == null) return null;
  return Math.round(goodsTotal * pct) / 100;
}
// รวมเป็นเงินทั้งสิ้น = ค่าสินค้า + ค่าดำเนินการ + ค่าขนส่งภายในจีน (ถ้ามี)
export function grandTotalOf(goodsTotal: number | null | undefined, pct: number, chinaShipping?: number | null): number | null {
  const fee = handlingFeeOf(goodsTotal, pct);
  return goodsTotal == null || fee == null ? null : Math.round((goodsTotal + fee + (chinaShipping ?? 0)) * 100) / 100;
}

// ยอดที่ลูกค้าจ่ายแล้ว (สกุลของออเดอร์): มีรายการชำระเงิน = รวมยอดที่คิดเป็นสกุลออเดอร์ · ยังไม่มี = ใช้ช่องมัดจำเดิม
export function paidOf(order: { depositAmount: number | null }, payments: { appliedAmount: number }[]): number | null {
  if (payments.length === 0) return order.depositAmount;
  return Math.round(payments.reduce((s, p) => s + p.appliedAmount, 0) * 100) / 100;
}

// ยอดค้างชำระ = รวมเป็นเงินทั้งสิ้น (ค่าสินค้า + ค่าดำเนินการ + ค่าขนส่งภายในจีน) − ยอดที่จ่ายแล้ว
export function orderBalance(
  order: { totalAmount: number | null; depositAmount: number | null; handlingFeePct: number; chinaShippingFee: number | null },
  payments: { appliedAmount: number }[],
): number | null {
  return balanceOf(grandTotalOf(order.totalAmount, order.handlingFeePct, order.chinaShippingFee), paidOf(order, payments));
}
