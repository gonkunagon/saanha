// เรทค่าขนส่ง แยกตามประเภทสินค้า
// ⚠️ ตัวเลขทั้งหมดในไฟล์นี้เป็นค่าตัวอย่าง ต้องแทนที่ด้วยเรทจริงก่อนเปิดใช้งาน
// เรทเงินหยวนไม่แสดงบนเว็บ — ลูกค้าต้องสอบถามทาง LINE

export type ShippingMethod = "truck" | "sea";

export const productTypes = ["general", "regulated", "brand"] as const;
export type ProductType = (typeof productTypes)[number];

type Rate = { perKg: number; perCbm: number };

// ราคาเป็นบาท ต่อ กก. และ ต่อ คิว (CBM) — ระบบคิดราคาที่สูงกว่าระหว่างสองแบบ
export const shippingRates: Record<ProductType, Record<ShippingMethod, Rate>> = {
  // สินค้าทั่วไป
  general: {
    truck: { perKg: 45, perCbm: 6500 },
    sea: { perKg: 30, perCbm: 4500 },
  },
  // สินค้าที่ต้องมี อย. / มอก. เช่น อาหาร เครื่องสำอาง เครื่องใช้ไฟฟ้า
  regulated: {
    truck: { perKg: 65, perCbm: 8500 },
    sea: { perKg: 45, perCbm: 6000 },
  },
  // สินค้าแบรนด์
  brand: {
    truck: { perKg: 85, perCbm: 10500 },
    sea: { perKg: 60, perCbm: 7500 },
  },
};

// เรทค่าขนส่งมาตรฐานในหลังบ้าน (บาท / คิว) — ใช้คิดค่าขนส่งของออเดอร์ในตู้ ถ้าออเดอร์ไม่ได้ตั้งเรทเอง
export const DEFAULT_SHIPPING_RATE_PER_CBM = 6500;

export const transitDays: Record<ShippingMethod, string> = {
  truck: "5-7",
  sea: "12-18",
};
