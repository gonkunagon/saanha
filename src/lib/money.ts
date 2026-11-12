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
// ยอดเงิน 2 ฝั่งของออเดอร์ (สกุลของออเดอร์)
export type OrderSides = {
  totalAmount: number | null; // ค่าสินค้าที่จ่ายร้าน
  chinaShippingFee: number | null; // ค่าขนส่งในจีนที่จ่ายร้าน
  customerGoodsAmount: number | null; // ค่าสินค้าที่คิดลูกค้า (ว่าง = ค่าสินค้า + ค่าดำเนินการ % แบบเดิม)
  customerChinaShipping: number | null; // ค่าขนส่งในจีนที่คิดลูกค้า (ว่าง = เท่าที่จ่ายร้าน)
  handlingFeePct: number;
};
const r2 = (n: number) => Math.round(n * 100) / 100;
// ยอดที่จ่ายร้านค้า = ค่าสินค้า + ค่าขนส่งในจีน
export function supplierTotalOf(o: Pick<OrderSides, "totalAmount" | "chinaShippingFee">): number | null {
  return o.totalAmount == null ? null : r2(o.totalAmount + (o.chinaShippingFee ?? 0));
}
export function customerGoodsOf(o: OrderSides): number | null {
  return o.customerGoodsAmount ?? grandTotalOf(o.totalAmount, o.handlingFeePct);
}
export function customerShippingOf(o: OrderSides): number | null {
  return o.customerChinaShipping ?? o.chinaShippingFee;
}
// รวมเป็นเงินทั้งสิ้น (ยอดที่คิดลูกค้า) = ค่าสินค้าที่คิดลูกค้า + ค่าขนส่งในจีนที่คิดลูกค้า
export function customerTotalOf(o: OrderSides): number | null {
  const goods = customerGoodsOf(o);
  return goods == null ? null : r2(goods + (customerShippingOf(o) ?? 0));
}

// ยังไม่มีรายการชำระเงิน = มัดจำ + ชำระยอดที่เหลือ (ว่างทั้งคู่ = ไม่รู้)
export function paidOf(order: { depositAmount: number | null; balancePaidAmount: number | null }, payments: { appliedAmount: number }[]): number | null {
  if (payments.length === 0) {
    if (order.depositAmount == null && order.balancePaidAmount == null) return null;
    return Math.round(((order.depositAmount ?? 0) + (order.balancePaidAmount ?? 0)) * 100) / 100;
  }
  return Math.round(payments.reduce((s, p) => s + p.appliedAmount, 0) * 100) / 100;
}

// ยอดค้างชำระ = รวมเป็นเงินทั้งสิ้นที่คิดลูกค้า − ยอดที่จ่ายแล้ว
export function orderBalance(
  order: OrderSides & { depositAmount: number | null; balancePaidAmount: number | null },
  payments: { appliedAmount: number }[],
): number | null {
  return balanceOf(customerTotalOf(order), paidOf(order, payments));
}
