// เชื่อมระบบ JJ Cargo (บริษัทขนส่งที่รับงานต่อ) เพื่อดึงข้อมูลพัสดุจากเลขพัสดุจีน
// ใช้ API ภายในของเว็บ JJ Cargo: ล็อกอินด้วยบัญชีบริษัท (session เป็น cookie) แล้วค้นหา PackingList
// ตั้งค่าใน .env.local: JJ_CARGO_URL, JJ_CARGO_USERNAME, JJ_CARGO_PASSWORD
// ⚠️ ถ้า JJ Cargo เปลี่ยนโครงสร้างระบบ ไฟล์นี้อาจต้องแก้ตาม

export class JjCargoError extends Error {}

// 1 แถวใน PackingList ของ JJ Cargo = 1 กล่อง/กระสอบ
export type JjParcel = {
  packingCode: string;
  trackingNo: string;
  weightKg: number | null;
  widthCm: number | null;
  lengthCm: number | null;
  heightCm: number | null;
  shipmentCode: string | null; // รอบขนส่งของ JJ (เทียบได้กับตู้)
  offChinaDate: string | null; // วันที่ออกจากจีน (YYYY-MM-DD)
};

type RawPacking = {
  id: number;
  packing_code: string;
  customer_code?: string | null;
  tracking_no: string | null;
  weight: number | null;
  cubic1: number | null;
  cubic2: number | null;
  cubic3: number | null;
  shipment_code: string | null;
  off_china_date: string | null;
};

const normalize = (s: string) => s.replace(/\s+/g, "").toUpperCase();
const num = (v: number | null | undefined) => (typeof v === "number" && Number.isFinite(v) && v > 0 ? v : null);

// API ของ JJ ค้นหาแบบ "มีคำนี้อยู่" (CH8 ก็เจอ CH83207) จึงกรองให้ตรงทั้งเลขอีกชั้น
export function mapParcels(rows: RawPacking[], trackingNo: string): JjParcel[] {
  const wanted = normalize(trackingNo);
  return rows
    .filter((r) => r.tracking_no && normalize(r.tracking_no) === wanted)
    .sort((a, b) => a.id - b.id)
    .map((r) => ({
      packingCode: r.packing_code,
      trackingNo: r.tracking_no!,
      weightKg: num(r.weight),
      widthCm: num(r.cubic1),
      lengthCm: num(r.cubic2),
      heightCm: num(r.cubic3),
      shipmentCode: r.shipment_code,
      offChinaDate: r.off_china_date,
    }));
}

// ดึงเฉพาะลูกค้าที่กำหนดใน JJ_CARGO_CUSTOMER_CODES (คั่นด้วย , ไม่สนตัวพิมพ์เล็ก/ใหญ่) — ว่าง = ทุกลูกค้า
function allowedCustomer(): (code: string | null | undefined) => boolean {
  const codes = (process.env.JJ_CARGO_CUSTOMER_CODES ?? "")
    .split(",")
    .map((c) => c.trim().toLowerCase())
    .filter(Boolean);
  if (codes.length === 0) return () => true;
  return (code) => Boolean(code) && codes.includes(code!.trim().toLowerCase());
}

function config() {
  const url = process.env.JJ_CARGO_URL?.replace(/\/+$/, "");
  const username = process.env.JJ_CARGO_USERNAME;
  const password = process.env.JJ_CARGO_PASSWORD;
  if (!url || !username || !password) throw new JjCargoError("ยังไม่ได้ตั้งค่าการเชื่อมต่อ JJ Cargo (ดู README)");
  return { url, username, password };
}

// เก็บ session ไว้ในหน่วยความจำ จะได้ไม่ต้องล็อกอินทุกครั้งที่ค้นหา
let sessionCookie: string | null = null;

async function login() {
  const { url, username, password } = config();
  const res = await fetch(`${url}/api/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ username, password }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new JjCargoError("ล็อกอิน JJ Cargo ไม่สำเร็จ (ตรวจสอบชื่อผู้ใช้/รหัสผ่านใน .env.local)");
  const cookies = res.headers.getSetCookie().map((c) => c.split(";")[0]);
  if (cookies.length === 0) throw new JjCargoError("JJ Cargo ไม่ส่ง session กลับมา");
  sessionCookie = cookies.join("; ");
}

async function api<T>(path: string): Promise<T> {
  const { url } = config();
  if (!sessionCookie) await login();
  const call = () =>
    fetch(`${url}/api${path}`, { headers: { cookie: sessionCookie! }, signal: AbortSignal.timeout(10_000) });
  let res = await call();
  if (res.status === 401) {
    // session หมดอายุ: ล็อกอินใหม่แล้วลองอีกครั้ง
    await login();
    res = await call();
  }
  if (!res.ok) throw new JjCargoError(`JJ Cargo ตอบกลับผิดพลาด (${res.status})`);
  return res.json() as Promise<T>;
}

export async function findParcelsByTracking(trackingNo: string): Promise<JjParcel[]> {
  const rows = await api<RawPacking[]>(`/packing?${new URLSearchParams({ tracking: trackingNo.trim() })}`);
  const allowed = allowedCustomer();
  return mapParcels(Array.isArray(rows) ? rows.filter((r) => allowed(r.customer_code)) : [], trackingNo);
}

// ---- ข้อมูลทั้งหมดสำหรับซิงค์เข้าหลังบ้าน (ดู src/lib/jjsync.ts) ----

export type JjSnapshotParcel = {
  id: number;
  packingCode: string;
  trackingNo: string | null;
  customerId: number;
  weightKg: number | null;
  widthCm: number | null;
  lengthCm: number | null;
  heightCm: number | null;
  shipmentCode: string | null;
  offChinaDate: string | null;
  createdAt: string; // "YYYY-MM-DD HH:mm:ss" เวลา UTC ตามระบบ JJ
  // ข้อมูลจากหน้ารายละเอียด (ดึงเฉพาะพัสดุที่ยังไม่เคยนำเข้า)
  jjOrderId: number | null;
  description: string | null; // เช่น "เสื้อผ้า × 100"
};
export type JjSnapshot = {
  parcels: JjSnapshotParcel[];
  shipments: { code: string; date: string | null; arrivedDate: string | null }[];
  customers: { id: number; code: string; name: string; phone: string | null }[];
};

type RawPackingDetail = RawPacking & {
  customer_id: number;
  created_at: string;
  items: { order_id: number | null; product_id: string | null; quantity: number | null; style_th: string | null }[];
  styles: { quantity: number | null; style_th: string | null }[];
};

function describe(d: RawPackingDetail): string | null {
  const parts = [
    ...d.items.map((i) => [i.style_th, i.product_id].filter(Boolean).join(" ") + (i.quantity ? ` × ${i.quantity}` : "")),
    ...d.styles.map((s) => (s.style_th ?? "") + (s.quantity ? ` × ${s.quantity}` : "")),
  ].filter((p) => p.trim());
  return parts.length ? parts.join(", ") : null;
}

// knownIds = PackingList id ที่นำเข้าแล้ว ไม่ต้องเปิดหน้ารายละเอียดซ้ำ (ลดจำนวนครั้งที่เรียก JJ)
export async function fetchJjSnapshot(knownIds: Set<number>): Promise<JjSnapshot> {
  const [list, shipments, customers] = await Promise.all([
    api<(RawPacking & { customer_id: number; created_at: string })[]>("/packing"),
    api<{ code: string; date: string | null; arrived_date: string | null }[]>("/r/shipments?from=2000-01-01&to=2100-12-31"),
    api<{ id: number; code: string; firstname: string | null; lastname: string | null; phone: string | null }[]>("/customers"),
  ]);

  const allowed = allowedCustomer();
  const parcels: JjSnapshotParcel[] = [];
  for (const p of list.filter((row) => allowed(row.customer_code))) {
    const base = {
      id: p.id,
      packingCode: p.packing_code,
      trackingNo: p.tracking_no?.trim() || null,
      customerId: p.customer_id,
      weightKg: num(p.weight),
      widthCm: num(p.cubic1),
      lengthCm: num(p.cubic2),
      heightCm: num(p.cubic3),
      shipmentCode: p.shipment_code,
      offChinaDate: p.off_china_date,
      createdAt: p.created_at,
      jjOrderId: null,
      description: null,
    };
    if (knownIds.has(p.id)) {
      parcels.push(base);
      continue;
    }
    const detail = await api<RawPackingDetail>(`/packing/${p.id}`);
    parcels.push({ ...base, jjOrderId: detail.items.find((i) => i.order_id)?.order_id ?? null, description: describe(detail) });
  }

  return {
    parcels,
    shipments: shipments.map((s) => ({ code: s.code, date: s.date, arrivedDate: s.arrived_date })),
    customers: customers.filter((c) => allowed(c.code)).map((c) => ({
      id: c.id,
      code: c.code,
      name: [c.firstname, c.lastname].filter(Boolean).join(" ") || c.code,
      phone: c.phone,
    })),
  };
}
