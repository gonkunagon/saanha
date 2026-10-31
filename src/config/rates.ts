// เรทค่าขนส่งและอัตราแลกเปลี่ยน
// ⚠️ ตัวเลขทั้งหมดในไฟล์นี้เป็นค่าตัวอย่าง ต้องแทนที่ด้วยเรทจริงก่อนเปิดใช้งาน

export type ShippingMethod = "truck" | "sea";

export const shippingRates: Record<
  ShippingMethod,
  { perKg: number; perCbm: number; days: string }
> = {
  // ราคาเป็นบาท ต่อ กก. และ ต่อ คิว (CBM) — ระบบคิดราคาที่สูงกว่าระหว่างสองแบบ
  truck: { perKg: 45, perCbm: 6500, days: "5-7" },
  sea: { perKg: 30, perCbm: 4500, days: "12-18" },
};

export const exchange = {
  // บาท ต่อ 1 หยวน ที่ลูกค้าจ่าย (รวมกำไรแล้ว)
  thbPerCny: 4.95,
  updatedAt: "2026-10-31",
};
