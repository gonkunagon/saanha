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
