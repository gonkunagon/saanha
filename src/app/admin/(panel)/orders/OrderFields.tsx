import type { Order } from "@/db/schema";
import type { PickerCustomer } from "@/lib/customers";
import { Field, MethodSelect } from "@/components/admin/ui";
import { PaymentFields } from "@/components/admin/PaymentFields";
import { CustomerPicker } from "@/components/admin/CustomerPicker";

// ช่องข้อมูลออเดอร์ ใช้ทั้งตอนสร้างและแก้ไข
// ลูกค้าต้องเลือกจากทะเบียนลูกค้า — preselectId มาจากปุ่ม "สร้างออเดอร์ให้ลูกค้านี้"
export function OrderFields({
  order,
  customers,
  preselectId,
}: {
  order?: Order;
  customers: PickerCustomer[];
  preselectId?: number;
}) {
  return (
    <>
      <CustomerPicker
        customers={customers}
        selectedId={order ? order.customerId : preselectId}
        legacy={order && !order.customerId ? { name: order.customerName, phone: order.customerPhone } : undefined}
      />
      <Field label="เลขคำสั่งซื้อ (เช่น เลขออเดอร์ 1688 / Taobao)" className="sm:col-span-2">
        <input name="purchaseOrderNo" defaultValue={order?.purchaseOrderNo ?? ""} className="input" autoComplete="off" />
      </Field>
      <PaymentFields
        shopName={order?.shopName}
        currency={order?.currency}
        totalAmount={order?.totalAmount}
        depositAmount={order?.depositAmount}
        handlingFeePct={order?.handlingFeePct}
      />
      <Field label="วิธีขนส่ง">
        <MethodSelect defaultValue={order?.method} />
      </Field>
      <Field label="Tracking no. จากจีนมาไทย (ใช้ภายใน ลูกค้าไม่เห็น)" className="sm:col-span-2">
        <input name="intlTrackingNo" defaultValue={order?.intlTrackingNo ?? ""} className="input" autoComplete="off" />
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
