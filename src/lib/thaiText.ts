// จำนวนเงินเป็นตัวหนังสือภาษาไทย เช่น 1944.5 บาท → "หนึ่งพันเก้าร้อยสี่สิบสี่บาทห้าสิบสตางค์"
// หยวนใช้ "หยวน" / "เฟิน" แทน บาท / สตางค์

const DIGITS = ["", "หนึ่ง", "สอง", "สาม", "สี่", "ห้า", "หก", "เจ็ด", "แปด", "เก้า"];
const PLACES = ["", "สิบ", "ร้อย", "พัน", "หมื่น", "แสน"];

// อ่านเลขไม่เกิน 6 หลัก
function readGroup(n: number): string {
  const s = String(n);
  let out = "";
  for (let i = 0; i < s.length; i++) {
    const d = Number(s[i]);
    const place = s.length - i - 1;
    if (d === 0) continue;
    if (place === 1 && d === 1) out += "สิบ";
    else if (place === 1 && d === 2) out += "ยี่สิบ";
    else if (place === 0 && d === 1 && s.length > 1) out += "เอ็ด";
    else out += DIGITS[d] + PLACES[place];
  }
  return out;
}

// อ่านจำนวนเต็มใด ๆ (แบ่งทีละ 6 หลัก ต่อด้วย "ล้าน")
function readInteger(n: number): string {
  if (n === 0) return "ศูนย์";
  let out = "";
  let rest = Math.floor(n);
  const groups: number[] = [];
  while (rest > 0) {
    groups.unshift(rest % 1_000_000);
    rest = Math.floor(rest / 1_000_000);
  }
  groups.forEach((g, i) => {
    // หลักหน่วยหลังคำว่า "ล้าน" อ่าน "เอ็ด" เช่น 1,000,001 = หนึ่งล้านเอ็ด
    if (g === 1 && i > 0) out += "เอ็ด";
    else if (g) out += readGroup(g);
    if (i < groups.length - 1) out += "ล้าน";
  });
  return out;
}

export function amountInThaiWords(amount: number, currency: "THB" | "CNY" = "THB"): string {
  const [major, minor] = currency === "CNY" ? ["หยวน", "เฟิน"] : ["บาท", "สตางค์"];
  const cents = Math.round(Math.abs(amount) * 100);
  const whole = Math.floor(cents / 100);
  const frac = cents % 100;
  const sign = amount < 0 ? "ลบ" : "";
  return `${sign}${readInteger(whole)}${major}${frac ? readGroup(frac) + minor : "ถ้วน"}`;
}
