// คิว (CBM) = กว้าง × ยาว × สูง (ซม.) × จำนวนกล่อง ÷ 1,000,000
// ใช้ทั้งหน้าเว็บ (แสดงผลทันทีที่พิมพ์) และฝั่งเซิร์ฟเวอร์ (ตอนบันทึก)
export function calcCbm(
  widthCm: number | null,
  lengthCm: number | null,
  heightCm: number | null,
  boxes: number | null,
): number | null {
  if (!widthCm || !lengthCm || !heightCm) return null;
  const cbm = (widthCm * lengthCm * heightCm * (boxes && boxes > 0 ? boxes : 1)) / 1_000_000;
  return Math.round(cbm * 10_000) / 10_000;
}
