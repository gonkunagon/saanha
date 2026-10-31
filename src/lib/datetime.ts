// เวลาทั้งหมดในระบบหลังบ้านใช้เวลาไทย (UTC+7) ไม่ว่าเซิร์ฟเวอร์จะอยู่ที่ไหน

const TZ = "Asia/Bangkok";

// ค่าจาก <input type="datetime-local"> เช่น "2026-11-01T14:30" (ถือเป็นเวลาไทย)
export function parseLocalDateTime(value: FormDataEntryValue | null): Date | null {
  const v = String(value ?? "").trim();
  if (!v) return null;
  const date = new Date(`${v.length === 10 ? `${v}T00:00` : v}:00+07:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

// แปลงกลับเป็นค่าสำหรับใส่ใน <input type="datetime-local">
export function toLocalInputValue(date: Date | null): string {
  if (!date) return "";
  const bkk = new Date(date.getTime() + 7 * 60 * 60 * 1000);
  return bkk.toISOString().slice(0, 16);
}

export function nowLocalInputValue(): string {
  return toLocalInputValue(new Date());
}

export function formatThaiDateTime(date: Date | null, locale: "th" | "en" = "th"): string {
  if (!date) return "-";
  return date.toLocaleString(locale === "th" ? "th-TH" : "en-GB", {
    timeZone: TZ,
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
