// ขั้นตอนสถานะของรายการสินค้า ตั้งแต่สั่งซื้อจนถึงมือลูกค้า (ใช้ได้ทั้งฝั่งเซิร์ฟเวอร์และหน้าเว็บ)
// - ordered, china_warehouse, out_for_delivery, delivered : อัปเดตที่รายการสินค้า
// - loaded, departed, customs, thai_warehouse : มาจากตู้ที่รายการนั้นอยู่

export const itemStages = [
  "ordered",
  "china_warehouse",
  "loaded",
  "departed",
  "customs",
  "thai_warehouse",
  "out_for_delivery",
  "delivered",
] as const;
export type ItemStage = (typeof itemStages)[number];

export const containerStageFields = {
  loaded: "loadedAt",
  departed: "departedAt",
  customs: "customsAt",
  thai_warehouse: "arrivedAt",
} as const;
export type ContainerStage = keyof typeof containerStageFields;
export const containerStages = Object.keys(containerStageFields) as ContainerStage[];

export const stageLabelsTh: Record<ItemStage, string> = {
  ordered: "สร้างออเดอร์แล้ว",
  china_warehouse: "ถึงโกดังจีน",
  loaded: "ปิดตู้ / โหลดสินค้าที่จีน",
  departed: "ออกจากจีน",
  customs: "ถึงด่าน / ตรวจปล่อยศุลกากร",
  thai_warehouse: "ถึงโกดังไทย",
  out_for_delivery: "กำลังจัดส่งถึงลูกค้า",
  delivered: "จัดส่งสำเร็จ",
};

type ItemDates = {
  createdAt: Date;
  receivedAt: Date | null;
  outForDeliveryAt: Date | null;
  deliveredAt: Date | null;
};
type ContainerDates = {
  loadedAt: Date | null;
  departedAt: Date | null;
  customsAt: Date | null;
  arrivedAt: Date | null;
} | null;

export function itemStageDates(item: ItemDates, container: ContainerDates): Record<ItemStage, Date | null> {
  return {
    ordered: item.createdAt,
    china_warehouse: item.receivedAt,
    loaded: container?.loadedAt ?? null,
    departed: container?.departedAt ?? null,
    customs: container?.customsAt ?? null,
    thai_warehouse: container?.arrivedAt ?? null,
    out_for_delivery: item.outForDeliveryAt,
    delivered: item.deliveredAt,
  };
}

// สถานะปัจจุบัน = ขั้นสุดท้ายที่มีวันที่
export function currentStage(dates: Record<ItemStage, Date | null>): ItemStage {
  let stage: ItemStage = "ordered";
  for (const s of itemStages) if (dates[s]) stage = s;
  return stage;
}

export const stageIndex = (s: ItemStage) => itemStages.indexOf(s);

// สถานะออเดอร์ = รายการที่ช้าที่สุด (ออเดอร์จะ "จัดส่งสำเร็จ" เมื่อทุกรายการส่งถึงแล้ว)
export function slowestStage(stages: ItemStage[]): ItemStage {
  if (stages.length === 0) return "ordered";
  return stages.reduce((min, s) => (stageIndex(s) < stageIndex(min) ? s : min));
}
