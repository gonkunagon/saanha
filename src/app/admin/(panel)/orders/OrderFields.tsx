import type { Order } from "@/db/schema";
import { Field, MethodSelect } from "@/components/admin/ui";

// ช่องข้อมูลออเดอร์ ใช้ทั้งตอนสร้างและแก้ไข
export function OrderFields({ order }: { order?: Order }) {
  return (
    <>
      <Field label="เลขคำสั่งซื้อ (เช่น เลขออเดอร์ 1688 / Taobao)" className="sm:col-span-2">
        <input name="purchaseOrderNo" defaultValue={order?.purchaseOrderNo ?? ""} className="input" autoComplete="off" />
      </Field>
      <Field label="ชื่อลูกค้า *">
        <input name="customerName" required defaultValue={order?.customerName} className="input" />
      </Field>
      <Field label="เบอร์โทร * (ลูกค้าใช้ 4 ตัวท้ายเช็คสถานะ)">
        <input name="customerPhone" required type="tel" defaultValue={order?.customerPhone} className="input" />
      </Field>
      <Field label="LINE ID">
        <input name="customerLineId" defaultValue={order?.customerLineId ?? ""} className="input" />
      </Field>
      <Field label="วิธีขนส่ง">
        <MethodSelect defaultValue={order?.method} />
      </Field>
      <Field label="บริษัทขนส่งที่รับงานต่อ">
        <input name="provider" defaultValue={order?.provider ?? ""} className="input" />
      </Field>
      <Field label="External ID (เลขออเดอร์ของบริษัทขนส่ง)">
        <input name="externalId" defaultValue={order?.externalId ?? ""} className="input" />
      </Field>
      <Field label="หมายเหตุถึงลูกค้า (แสดงในหน้าติดตามพัสดุ)" className="sm:col-span-2">
        <textarea name="note" rows={2} defaultValue={order?.note ?? ""} className="input" />
      </Field>
      <Field label="หมายเหตุภายใน (ลูกค้าไม่เห็น)" className="sm:col-span-2">
        <textarea name="internalNote" rows={2} defaultValue={order?.internalNote ?? ""} className="input" />
      </Field>
    </>
  );
}
