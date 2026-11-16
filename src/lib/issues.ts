// ป้ายภาษาไทยของปัญหาสินค้า (ใช้ทั้งหน้าออเดอร์และหน้ารวมปัญหาสินค้า)
export const issueKindLabels = { damaged: "เสียหาย", lost: "สูญหาย", wrong: "ได้ไม่ครบ / ส่งผิด" } as const;
export const issueFoundAtLabels = { china: "โกดังจีน", thailand: "ตอนรับเข้าโกดังไทย", customer: "ลูกค้าแจ้งหลังได้รับ" } as const;
export const issueResponsibleLabels = { supplier: "ร้านค้าจีน", carrier: "บริษัทขนส่ง", shop: "ร้านเราเอง", unknown: "ยังไม่ทราบ" } as const;
export const issueStatusLabels = { open: "เปิดเรื่อง", claiming: "รอเคลม", closed: "ปิดเรื่องแล้ว" } as const;

export type IssueKind = keyof typeof issueKindLabels;
export type IssueStatus = keyof typeof issueStatusLabels;

export const issueStatusClass: Record<IssueStatus, string> = {
  open: "bg-brand-50 text-brand-700 ring-brand-200",
  claiming: "bg-amber-50 text-amber-800 ring-amber-200",
  closed: "bg-gray-100 text-gray-600 ring-gray-200",
};

// ร้านเสียจริง = ชดเชยลูกค้า − เคลมคืนได้ (ติดลบ = ได้คืนมากกว่าที่ชดเชย)
export const issueNetLoss = (i: { compensation: number | null; recovered: number | null }) =>
  Math.round(((i.compensation ?? 0) - (i.recovered ?? 0)) * 100) / 100;
