import fs from "node:fs";
import path from "node:path";

// ข้อมูลพัสดุมาจาก Google Sheets ที่ "เผยแพร่เป็น CSV" (ตั้งค่า TRACKING_SHEET_CSV_URL)
// ตอน dev ถ้ายังไม่ตั้งค่า จะใช้ข้อมูลตัวอย่างจาก data/tracking-sample.csv
// แต่ละแถว = 1 พัสดุ เจ้าหน้าที่กรอกวันที่ของแต่ละขั้น สถานะล่าสุดคือขั้นสุดท้ายที่มีวันที่

export const trackingStages = [
  "ordered",
  "china_warehouse",
  "departed",
  "thai_warehouse",
  "out_for_delivery",
  "delivered",
] as const;
export type TrackingStage = (typeof trackingStages)[number];

export type Shipment = {
  trackingNo: string;
  method: string;
  boxes: string;
  weightKg: string;
  cbm: string;
  domesticTracking: string;
  note: string;
  stages: { stage: TrackingStage; at: string | null }[];
};

export class TrackingNotConfiguredError extends Error {}

// ตัวแยก CSV แบบง่าย รองรับเครื่องหมายคำพูดและจุลภาคในข้อความ
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field); rows.push(row); row = []; field = "";
    } else field += c;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((f) => f.trim()));
}

async function loadCsv(): Promise<string> {
  const url = process.env.TRACKING_SHEET_CSV_URL;
  if (url) {
    const res = await fetch(url, { next: { revalidate: 60 } }); // ดึงข้อมูลใหม่ทุก 1 นาที
    if (!res.ok) throw new Error(`tracking sheet fetch failed: ${res.status}`);
    return res.text();
  }
  // ห้ามใช้ข้อมูลตัวอย่างบนเว็บจริง
  if (process.env.NODE_ENV === "production") throw new TrackingNotConfiguredError();
  return fs.readFileSync(path.join(process.cwd(), "data", "tracking-sample.csv"), "utf8");
}

const normalizeNo = (s: string) => s.replace(/\s+/g, "").toUpperCase();
const last4 = (s: string) => s.replace(/\D/g, "").slice(-4);

export async function findShipment(trackingNo: string, phoneLast4: string): Promise<Shipment | null> {
  const [header, ...rows] = parseCsv(await loadCsv());
  if (!header) return null;
  const col = (name: string) => header.findIndex((h) => h.trim().toLowerCase() === name);
  const get = (row: string[], name: string) => (row[col(name)] ?? "").trim();

  const wanted = normalizeNo(trackingNo);
  const row = rows.find((r) => normalizeNo(get(r, "tracking_no")) === wanted);
  // เทียบเบอร์ 4 ตัวท้าย เพื่อไม่ให้คนอื่นดูข้อมูลพัสดุได้จากเลขพัสดุอย่างเดียว
  if (!row || last4(get(row, "phone")) !== phoneLast4) return null;

  return {
    trackingNo: get(row, "tracking_no"),
    method: get(row, "method").toLowerCase(),
    boxes: get(row, "boxes"),
    weightKg: get(row, "weight_kg"),
    cbm: get(row, "cbm"),
    domesticTracking: get(row, "domestic_tracking"),
    note: get(row, "note"),
    stages: trackingStages.map((stage) => ({ stage, at: get(row, `${stage}_at`) || null })),
  };
}
