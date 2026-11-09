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
  paymentsLinked,
  todayRate,
  shipping,
}: {
  order?: Order;
  customers: PickerCustomer[];
  preselectId?: number;
  paymentsLinked?: boolean;
  todayRate?: number | null;
  shipping?: React.ReactNode; // พัสดุ / ตู้ ของแต่ละรายการ (หน้าแก้ไขออเดอร์) — แสดงใต้วิธีขนส่ง
}) {
  return (
    <>
      {/* แก้ไขออเดอร์ที่ผูกลูกค้าแล้ว: ไม่ต้องมีช่องเลือกลูกค้า (แก้ข้อมูลลูกค้าที่เมนูลูกค้า) — เก็บ customerId ไว้เหมือนเดิม
          สร้างออเดอร์ใหม่ / ออเดอร์เก่าที่ยังไม่ผูกลูกค้า: ใช้ช่องเลือกลูกค้า */}
      {order?.customerId ? (
        <input type="hidden" name="customerId" value={order.customerId} />
      ) : (
        <CustomerPicker
          customers={customers}
          selectedId={order ? order.customerId : preselectId}
          legacy={order && !order.customerId ? { name: order.customerName, phone: order.customerPhone } : undefined}
        />
      )}
      <Field label="เลขคำสั่งซื้อ (เช่น เลขออเดอร์ 1688 / Taobao)">
        <input name="purchaseOrderNo" defaultValue={order?.purchaseOrderNo ?? ""} className="input" autoComplete="off" />
      </Field>
      <Field label="Platform / แหล่งที่มาของร้าน (ข้อมูลภายใน ลูกค้าไม่เห็น)">
        <input name="platform" list="platform-options" defaultValue={order?.platform ?? ""} className="input" autoComplete="off" placeholder="เช่น 1688, Taobao, Alibaba" />
        <datalist id="platform-options">
          {["1688", "Taobao", "Tmall", "Alibaba", "Pinduoduo", "JD", "WeChat", "โรงงานโดยตรง"].map((p) => (
            <option key={p} value={p} />
          ))}
        </datalist>
      </Field>
      <PaymentFields
        shopName={order?.shopName}
        hideShopOnQuote={order?.hideShopOnQuote}
        currency={order?.currency}
        totalAmount={order?.totalAmount}
        depositAmount={order?.depositAmount}
        handlingFeePct={order?.handlingFeePct}
        chinaShippingFee={order?.chinaShippingFee}
        paymentsLinked={paymentsLinked}
        orderRate={order ? order.orderRate : todayRate}
      />
      <Field label="วิธีขนส่ง">
        <span className="block w-40">
          <MethodSelect defaultValue={order?.method} />
        </span>
      </Field>
      <Field label="บริษัทขนส่งที่รับงานต่อ">
        <input name="provider" defaultValue={order?.provider ?? ""} className="input" />
      </Field>
      {shipping}
      <Field label="หมายเหตุถึงลูกค้า (แสดงในหน้าติดตามพัสดุ)" className="sm:col-span-2">
        <textarea name="note" rows={2} defaultValue={order?.note ?? ""} className="input" />
      </Field>
      <Field label="หมายเหตุภายใน (ลูกค้าไม่เห็น)" className="sm:col-span-2">
        <textarea name="internalNote" rows={2} defaultValue={order?.internalNote ?? ""} className="input" />
      </Field>
    </>
  );
}
