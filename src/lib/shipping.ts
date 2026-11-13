import { DEFAULT_SHIPPING_RATE_PER_CBM } from "@/config/rates";

// ค่าขนส่งจีน → ไทย ของออเดอร์ในตู้ = คิวรวม × เรท (บาท / คิว) ของออเดอร์ (ไม่ตั้ง = เรทมาตรฐาน)
export const shippingRateOf = (rate: number | null) => rate ?? DEFAULT_SHIPPING_RATE_PER_CBM;
// ค่าขนส่งของออเดอร์ (2 ฝั่ง) จากรายการที่อยู่ในตู้แล้ว — ยังไม่มีรายการเข้าตู้ = null
// ขาย = คิว × เรทของออเดอร์ · ทุน = คิว × ต้นทุน/คิว ของตู้ (ตู้ไหนยังไม่ใส่ต้นทุน = ทุน null)
type ShipItem = { cbm: number | null; container: { costPerCbm: number | null } | null };
// ออเดอร์ฝากส่ง: ใช้ค่าขนส่ง / ต้นทุน (บาท) ที่กรอกเองเท่านั้น ไม่คำนวณจากคิว
export function orderShippingOf(
  items: ShipItem[],
  rate: number | null,
  manual?: { shippingCharge: number | null; shippingCost: number | null; shippingOnly: boolean },
) {
  if (manual?.shippingOnly) {
    const { shippingCharge: sell, shippingCost: cost } = manual;
    return { sell, cost, profit: sell != null && cost != null ? Math.round((sell - cost) * 100) / 100 : null };
  }
  const inBox = items.filter((i) => i.container);
  const charge = manual?.shippingOnly ? manual.shippingCharge : null;
  const manualCost = manual?.shippingOnly ? manual.shippingCost : null;
  if (inBox.length === 0 && charge == null && manualCost == null) return { sell: null, cost: null, profit: null };
  const r2 = (n: number) => Math.round(n * 100) / 100;
  const sell = charge ?? r2(inBox.reduce((s, i) => s + (i.cbm ?? 0), 0) * shippingRateOf(rate));
  const cost =
    manualCost ??
    (inBox.length > 0 && inBox.every((i) => i.container!.costPerCbm != null)
      ? r2(inBox.reduce((s, i) => s + (i.cbm ?? 0) * i.container!.costPerCbm!, 0))
      : null);
  return { sell, cost, profit: cost == null ? null : r2(sell - cost) };
}
export const shippingCostOf = (items: { cbm: number | null }[], rate: number | null) =>
  Math.round(items.reduce((s, i) => s + (i.cbm ?? 0), 0) * shippingRateOf(rate) * 100) / 100;
