// Tracking no. จีน → ไทย ของออเดอร์ เก็บหลายเลขในช่องเดียว (บรรทัดละเลข) — 1 ออเดอร์มีได้หลายพัสดุ
export const splitTracking = (v: string | null | undefined): string[] =>
  (v ?? "")
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter(Boolean);

// รวมหลายช่องจากฟอร์มเป็นค่าเดียว (ตัดช่องว่างและเลขซ้ำ) — ไม่มีเลยคืน null
export const joinTracking = (values: string[]): string | null => {
  const list = [...new Set(values.flatMap(splitTracking))];
  return list.length ? list.join("\n") : null;
};
