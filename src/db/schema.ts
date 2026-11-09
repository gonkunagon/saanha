import { boolean, customType, doublePrecision, integer, pgTable, text, timestamp as pgTimestamp } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// โครงสร้างข้อมูล
// - order (ออเดอร์) มีหลาย order_item (รายการสินค้า)
// - order_item แต่ละรายการอยู่ได้ 1 container (ตู้) → 1 ออเดอร์จึงกระจายอยู่หลายตู้ได้
//   ถ้าสินค้าชิ้นเดียวกันแบ่งไปหลายตู้ ให้แยกเป็นหลายรายการ
// - สถานะช่วงขนส่งจีน→ไทย อยู่ที่ตู้ อัปเดตตู้แล้วทุกรายการในตู้เปลี่ยนตาม
// - สถานะรับเข้าโกดังจีน / ส่งให้ลูกค้า อยู่ที่รายการสินค้า (ส่งบางส่วนได้)
// - provider + external_id เก็บไว้เชื่อมกับบริษัทขนส่งที่รับงานต่อ (อนาคตจะดึงสถานะจาก API ของเขา)

const id = () => integer("id").primaryKey().generatedByDefaultAsIdentity();
const timestamp = (name: string) => pgTimestamp(name, { withTimezone: true });
// เก็บไฟล์รูป (bytea ของ Postgres) เป็น Buffer
const bytea = customType<{ data: Buffer; driverData: Buffer }>({ dataType: () => "bytea" });
const createdAt = () => timestamp("created_at").notNull().$defaultFn(() => new Date());
const updatedAt = () =>
  timestamp("updated_at").notNull().$defaultFn(() => new Date()).$onUpdateFn(() => new Date());

export const shippingMethods = ["truck", "sea"] as const;
export type ShippingMethod = (typeof shippingMethods)[number];

export const currencies = ["THB", "CNY"] as const;
export type Currency = (typeof currencies)[number];

// admin = จัดการบัญชีพนักงานได้ / staff = ใช้งานออเดอร์และตู้ได้อย่างเดียว
export const userRoles = ["admin", "staff"] as const;
export type UserRole = (typeof userRoles)[number];

export const users = pgTable("users", {
  id: id(),
  username: text("username").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  role: text("role", { enum: userRoles }).notNull().default("staff"),
  active: boolean("active").notNull().default(true),
  createdAt: createdAt(),
});

export const containers = pgTable("containers", {
  id: id(),
  code: text("code").notNull().unique(),
  method: text("method", { enum: shippingMethods }).notNull(),
  provider: text("provider"),
  externalId: text("external_id"),
  note: text("note"),
  loadedAt: timestamp("loaded_at"), // ปิดตู้ / โหลดสินค้าที่จีน
  departedAt: timestamp("departed_at"), // ออกจากจีน
  customsAt: timestamp("customs_at"), // ถึงด่าน / ตรวจปล่อยศุลกากร
  arrivedAt: timestamp("arrived_at"), // ถึงโกดังไทย
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

// ทะเบียนลูกค้า — ออเดอร์ผูกกับลูกค้าได้ (customer_id) แต่ยังเก็บชื่อ/เบอร์ไว้ในออเดอร์ด้วย
// เพื่อให้หน้าติดตามพัสดุใช้เบอร์ตอนสร้างออเดอร์ และออเดอร์ที่ไม่ได้ผูกลูกค้า (เช่น นำเข้าจาก JJ) ยังใช้ได้
export const customers = pgTable("customers", {
  id: id(),
  code: text("code").unique(), // รหัสลูกค้า เช่น C0001 (เว้นว่างตอนเพิ่ม = ระบบออกให้)
  name: text("name").notNull(), // ชื่อที่ใช้เรียก / แสดงในออเดอร์ (เช่น ชื่อเล่น ชื่อร้าน)
  firstName: text("first_name"), // ชื่อจริง
  lastName: text("last_name"), // นามสกุล
  phone: text("phone").notNull(),
  lineId: text("line_id"),
  address: text("address"),
  note: text("note"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const orders = pgTable("orders", {
  id: id(),
  code: text("code").notNull().unique(),
  customerId: integer("customer_id").references(() => customers.id, { onDelete: "set null" }),
  customerName: text("customer_name").notNull(),
  customerPhone: text("customer_phone").notNull(),
  customerLineId: text("customer_line_id"),
  method: text("method", { enum: shippingMethods }).notNull(),
  intlTrackingNo: text("intl_tracking_no"), // Tracking no. ขนส่งจีน → ไทย (ใช้ภายใน ไม่ส่งไปหน้าติดตามพัสดุของลูกค้า)
  purchaseOrderNo: text("purchase_order_no"), // เลขคำสั่งซื้อ เช่น เลขออเดอร์จากร้านค้า 1688 / Taobao หรือเลข PO ของลูกค้า
  shopName: text("shop_name"), // ร้านค้าที่สั่งซื้อ
  // ไม่แสดงชื่อร้านในใบเสนอราคา (ร้านที่เราหามาเอง กันลูกค้าไปติดต่อร้านตรง)
  hideShopOnQuote: boolean("hide_shop_on_quote").notNull().default(false),
  platform: text("platform"), // แพลตฟอร์มที่สั่ง เช่น 1688, Taobao, Alibaba
  // ยอดเงินของคำสั่งซื้อ — ยอดค้างชำระ = ยอดเต็ม − มัดจำ (คำนวณตอนแสดงผล ไม่เก็บซ้ำ)
  currency: text("currency", { enum: currencies }).notNull().default("THB"),
  totalAmount: doublePrecision("total_amount"),
  depositAmount: doublePrecision("deposit_amount"),
  // ยอดที่ลูกค้าชำระส่วนที่เหลือ (ใช้คู่กับมัดจำ เมื่อออเดอร์ยังไม่มีรายการชำระเงิน)
  balancePaidAmount: doublePrecision("balance_paid_amount"),
  serviceFee: doublePrecision("service_fee"), // เลิกใช้แล้ว (ค่าบริการเป็นบาท) — แทนด้วย handlingFeePct ด้านล่าง
  // ค่าดำเนินการของร้าน คิดเป็น % ของยอดรวมค่าสินค้า (เลือกได้ 0–8%) — สกุลเงินเดียวกับค่าสินค้า
  handlingFeePct: integer("handling_fee_pct").notNull().default(5),
  // ค่าขนส่งภายในจีน (ร้านค้าจีนคิดค่าส่งมาโกดัง) — สกุลเดียวกับค่าสินค้า · บวกในรวมเป็นเงินทั้งสิ้น ไม่คิดค่าดำเนินการ ไม่นับเป็นกำไร
  chinaShippingFee: doublePrecision("china_shipping_fee"),
  // เรทหยวนตอนสั่งซื้อ (บาทต่อ 1 หยวน) — จดไว้ดูว่าตอนสั่งของเรทเท่าไหร่ (ไม่ได้ใช้คำนวณยอด)
  orderRate: doublePrecision("order_rate"),
  // วันเปิดบิล = วันที่สร้างออเดอร์ · quotedAt มีค่าเมื่อกด "ออกใบใหม่เป็นวันนี้" · quoteRate = เรทหยวนที่ใช้ในใบ (ล็อกเมื่อพ้นวันเปิดบิล)
  quotedAt: timestamp("quoted_at"),
  // เรทค่าขนส่งของออเดอร์นี้ (บาท / คิว) — ว่าง = เรทมาตรฐาน (DEFAULT_SHIPPING_RATE_PER_CBM)
  shippingRate: doublePrecision("shipping_rate"),
  quoteRate: doublePrecision("quote_rate"),
  provider: text("provider"),
  externalId: text("external_id"),
  note: text("note"), // หมายเหตุที่ลูกค้าเห็นในหน้าติดตามพัสดุ
  internalNote: text("internal_note"), // หมายเหตุภายใน ลูกค้าไม่เห็น
  // คีย์ของข้อมูลที่ซิงค์มาจากระบบอื่น (เช่น JJ Cargo) กันนำเข้าซ้ำ — ออเดอร์ที่สร้างเองเป็นค่าว่าง
  importKey: text("import_key").unique(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const orderItems = pgTable("order_items", {
  id: id(),
  orderId: integer("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  containerId: integer("container_id").references(() => containers.id, { onDelete: "set null" }),
  description: text("description").notNull(),
  spec: text("spec"), // รายละเอียด / ขนาด / สี ของสินค้า (แสดงในหน้ารายละเอียดสินค้าของใบเสนอราคา)
  productUrl: text("product_url"), // ลิงก์หน้าสินค้า (1688 / Taobao ฯลฯ) ใช้ภายใน เผื่อลูกค้าสั่งซ้ำ — ลูกค้าไม่เห็น
  quantity: integer("quantity"),
  unitPrice: doublePrecision("unit_price"), // ราคาต่อหน่วย (สกุลเงินเดียวกับค่าสินค้าของออเดอร์) ใช้ในใบเสนอราคา
  // ยอดรวมจากพัสดุทุกแถวใน item_packages (คำนวณใหม่ทุกครั้งที่บันทึก)
  boxes: integer("boxes"),
  weightKg: doublePrecision("weight_kg"),
  cbm: doublePrecision("cbm"),
  productionAt: timestamp("production_at"), // อยู่ระหว่างการผลิต (เฉพาะสินค้าที่สั่งผลิต)
  receivedAt: timestamp("received_at"), // ถึงโกดังจีน
  outForDeliveryAt: timestamp("out_for_delivery_at"),
  deliveredAt: timestamp("delivered_at"),
  domesticTracking: text("domestic_tracking"),
  importKey: text("import_key").unique(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

// พัสดุย่อยของรายการสินค้า: 1 รายการมีได้หลายพัสดุ หลายขนาด
// แต่ละแถว = กล่องขนาดเดียวกัน N กล่อง (cbm = กว้าง × ยาว × สูง × กล่อง ÷ 1,000,000)
export const itemPackages = pgTable("item_packages", {
  id: id(),
  itemId: integer("item_id")
    .notNull()
    .references(() => orderItems.id, { onDelete: "cascade" }),
  chinaTrackingNo: text("china_tracking_no"),
  boxes: integer("boxes"),
  weightKg: doublePrecision("weight_kg"), // น้ำหนักต่อกล่อง (รวมของแถว = × boxes)
  widthCm: doublePrecision("width_cm"),
  lengthCm: doublePrecision("length_cm"),
  heightCm: doublePrecision("height_cm"),
  cbm: doublePrecision("cbm"),
  importKey: text("import_key").unique(), // เช่น "jj:12" = PackingList id 12 ของ JJ Cargo
  createdAt: createdAt(),
});

// ค่าตั้งค่าของระบบแบบ key/value เช่น "cny_rate" = เรทหยวน→บาทของวันนี้ (ใช้ในใบเสนอราคา)
export const appSettings = pgTable("app_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: updatedAt(),
});

// รูปสินค้า (ย่อเป็น JPEG ไม่เกิน 1200px ตอนอัปโหลด) เก็บในฐานข้อมูล ใช้ในหน้ารายละเอียดสินค้าของใบเสนอราคา
export const itemImages = pgTable("item_images", {
  id: id(),
  itemId: integer("item_id")
    .notNull()
    .references(() => orderItems.id, { onDelete: "cascade" }),
  mime: text("mime").notNull(),
  data: bytea("data").notNull(),
  createdAt: createdAt(),
});

// การชำระเงินของออเดอร์ (ลูกค้าโอนได้หลายครั้ง เช่น มัดจำ + ส่วนที่เหลือ) — ยอดที่โอน วันที่ชำระ ช่องทาง
export const payments = pgTable("payments", {
  id: id(),
  orderId: integer("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  amount: doublePrecision("amount").notNull(),
  currency: text("currency", { enum: currencies }).notNull().default("THB"),
  paidAt: timestamp("paid_at").notNull(),
  method: text("method").notNull(), // ช่องทาง เช่น โอนธนาคาร กสิกร, พร้อมเพย์, เงินสด
  // ยอดนี้คิดเป็นเงินสกุลของออเดอร์เท่าไหร่ (ใช้หักยอดค้างชำระ) — สกุลเดียวกัน = เท่ากับ amount
  // คนละสกุล = แปลงด้วยเรทใบเสนอราคาวันที่บันทึก (rate = บาทต่อ 1 หยวน) หรือที่พนักงานกรอกเอง
  appliedAmount: doublePrecision("applied_amount").notNull(),
  rate: doublePrecision("rate"),
  bank: text("bank"), // ธนาคารที่ลูกค้าโอนมา (รายชื่อใน src/lib/banks.ts) — ไม่โอนผ่านธนาคาร = ว่าง
  note: text("note"),
  createdAt: createdAt(),
});

// พัสดุที่นำเข้าจากระบบอื่นแล้วถูกพนักงานลบทิ้ง — ซิงค์ครั้งต่อไปจะข้าม ไม่ดึงกลับมาอีก
export const ignoredImports = pgTable("ignored_imports", {
  importKey: text("import_key").primaryKey(),
  createdAt: createdAt(),
});

export const ordersRelations = relations(orders, ({ one, many }) => ({
  items: many(orderItems),
  payments: many(payments),
  customer: one(customers, { fields: [orders.customerId], references: [customers.id] }),
}));

export const customersRelations = relations(customers, ({ many }) => ({ orders: many(orders) }));

export const containersRelations = relations(containers, ({ many }) => ({ items: many(orderItems) }));

export const orderItemsRelations = relations(orderItems, ({ one, many }) => ({
  order: one(orders, { fields: [orderItems.orderId], references: [orders.id] }),
  container: one(containers, { fields: [orderItems.containerId], references: [containers.id] }),
  packages: many(itemPackages),
  images: many(itemImages),
}));

export const itemImagesRelations = relations(itemImages, ({ one }) => ({
  item: one(orderItems, { fields: [itemImages.itemId], references: [orderItems.id] }),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  order: one(orders, { fields: [payments.orderId], references: [orders.id] }),
}));

export const itemPackagesRelations = relations(itemPackages, ({ one }) => ({
  item: one(orderItems, { fields: [itemPackages.itemId], references: [orderItems.id] }),
}));

export type User = typeof users.$inferSelect;
export type Customer = typeof customers.$inferSelect;
export type Container = typeof containers.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type OrderItem = typeof orderItems.$inferSelect;
export type ItemPackage = typeof itemPackages.$inferSelect;
export type Payment = typeof payments.$inferSelect;
