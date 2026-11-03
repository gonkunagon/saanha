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
export function grandTotalOf(goodsTotal: number | null | undefined, pct: number): number | null {
  const fee = handlingFeeOf(goodsTotal, pct);
  return goodsTotal == null || fee == null ? null : Math.round((goodsTotal + fee) * 100) / 100;
}
