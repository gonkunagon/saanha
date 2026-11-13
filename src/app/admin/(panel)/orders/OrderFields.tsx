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
  goodsFromItems,
}: {
  order?: Order;
  customers: PickerCustomer[];
  preselectId?: number;
  paymentsLinked?: boolean;
  todayRate?: number | null;
  goodsFromItems?: { buy: boolean; sell: boolean }; // ค่าสินค้าคิดจากตารางรายการสินค้า (ช่องอ่านอย่างเดียว)
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
      {/* ประเภทออเดอร์: ฝากส่งอย่างเดียว = ซ่อนช่องค่าสินค้า (CSS .goods-only ใน globals.css) */}
      <fieldset className="sm:col-span-2">
        <span className="mb-1 block text-sm text-gray-600">ประเภทออเดอร์</span>
        <div className="flex flex-wrap gap-2">
          <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm has-checked:border-brand-600 has-checked:bg-brand-50 has-checked:text-brand-700">
            <input type="radio" name="orderType" value="purchase" defaultChecked={!order?.shippingOnly} className="accent-brand-600" />
            🛒 สั่งซื้อสินค้า + ขนส่ง
          </label>
          <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm has-checked:border-brand-600 has-checked:bg-brand-50 has-checked:text-brand-700">
            <input type="radio" name="orderType" value="shipping" defaultChecked={order?.shippingOnly} className="accent-brand-600" />
            📦 ฝากส่งอย่างเดียว (ลูกค้าสั่งของเอง)
          </label>
        </div>
      </fieldset>
      <Field label="เลขคำสั่งซื้อ (เช่น เลขออเดอร์ 1688 / Taobao)">
        <input name="purchaseOrderNo" defaultValue={order?.purchaseOrderNo ?? ""} className="input" autoComplete="off" />
      </Field>
      <div className="goods-only contents">
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
        balancePaidAmount={order?.balancePaidAmount}
        handlingFeePct={order?.handlingFeePct}
        chinaShippingFee={order?.chinaShippingFee}
        costRate={order?.costRate}
        customerGoodsAmount={order?.customerGoodsAmount}
        customerChinaShipping={order?.customerChinaShipping}
        goodsFromItems={goodsFromItems}
        key={`${order?.totalAmount}-${order?.customerGoodsAmount}`}
        paymentsLinked={paymentsLinked}
        orderRate={order ? order.orderRate : todayRate}
      />
      </div>
      <Field label="วิธีขนส่ง">
        <span className="block w-40">
          <MethodSelect defaultValue={order?.method} />
        </span>
      </Field>
      {/* ค่าขนส่งของออเดอร์ฝากส่ง (แสดงเฉพาะเมื่อเลือกฝากส่งอย่างเดียว — CSS .shipping-only) */}
      <div className="shipping-only contents">
        <Field label="ค่าขนส่งที่คิดลูกค้า (บาท)">
          <input name="shippingCharge" type="number" step="0.01" min={0} defaultValue={order?.shippingCharge ?? ""} className="input" />
        </Field>
        <Field label="ต้นทุนค่าขนส่งของร้าน (บาท · ลูกค้าไม่เห็น)">
          <input name="shippingCost" type="number" step="0.01" min={0} defaultValue={order?.shippingCost ?? ""} className="input" />
        </Field>
      </div>
      <Field label="บริษัทขนส่งที่รับงานต่อ">
        <input name="provider" defaultValue={order?.provider ?? ""} className="input" />
      </Field>
      <Field label="ที่อยู่จัดส่งสินค้า" className="sm:col-span-2">
        <textarea name="deliveryAddress" rows={2} defaultValue={order?.deliveryAddress ?? ""} placeholder="เว้นว่าง = ใช้ที่อยู่ในข้อมูลลูกค้า" className="input" />
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
