import { DEFAULT_SHIPPING_RATE_PER_CBM } from "@/config/rates";

// ค่าขนส่งจีน → ไทย ของออเดอร์ในตู้ = คิวรวม × เรท (บาท / คิว) ของออเดอร์ (ไม่ตั้ง = เรทมาตรฐาน)
export const shippingRateOf = (rate: number | null) => rate ?? DEFAULT_SHIPPING_RATE_PER_CBM;
export const shippingCostOf = (items: { cbm: number | null }[], rate: number | null) =>
  Math.round(items.reduce((s, i) => s + (i.cbm ?? 0), 0) * shippingRateOf(rate) * 100) / 100;
