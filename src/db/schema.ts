import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";

// โครงสร้างข้อมูล
// - order (ออเดอร์) มีหลาย order_item (รายการสินค้า)
// - order_item แต่ละรายการอยู่ได้ 1 container (ตู้) → 1 ออเดอร์จึงกระจายอยู่หลายตู้ได้
//   ถ้าสินค้าชิ้นเดียวกันแบ่งไปหลายตู้ ให้แยกเป็นหลายรายการ
// - สถานะช่วงขนส่งจีน→ไทย อยู่ที่ตู้ อัปเดตตู้แล้วทุกรายการในตู้เปลี่ยนตาม
// - สถานะรับเข้าโกดังจีน / ส่งให้ลูกค้า อยู่ที่รายการสินค้า (ส่งบางส่วนได้)
// - provider + external_id เก็บไว้เชื่อมกับบริษัทขนส่งที่รับงานต่อ (อนาคตจะดึงสถานะจาก API ของเขา)

const id = () => integer("id").primaryKey({ autoIncrement: true });
const timestamp = (name: string) => integer(name, { mode: "timestamp" });
const createdAt = () => timestamp("created_at").notNull().$defaultFn(() => new Date());
const updatedAt = () =>
  timestamp("updated_at").notNull().$defaultFn(() => new Date()).$onUpdateFn(() => new Date());

export const shippingMethods = ["truck", "sea"] as const;
export type ShippingMethod = (typeof shippingMethods)[number];

// admin = จัดการบัญชีพนักงานได้ / staff = ใช้งานออเดอร์และตู้ได้อย่างเดียว
export const userRoles = ["admin", "staff"] as const;
export type UserRole = (typeof userRoles)[number];

export const users = sqliteTable("users", {
  id: id(),
  username: text("username").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  role: text("role", { enum: userRoles }).notNull().default("staff"),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  createdAt: createdAt(),
});

export const containers = sqliteTable("containers", {
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

export const orders = sqliteTable("orders", {
  id: id(),
  code: text("code").notNull().unique(),
  customerName: text("customer_name").notNull(),
  customerPhone: text("customer_phone").notNull(),
  customerLineId: text("customer_line_id"),
  method: text("method", { enum: shippingMethods }).notNull(),
  provider: text("provider"),
  externalId: text("external_id"),
  note: text("note"), // หมายเหตุที่ลูกค้าเห็นในหน้าติดตามพัสดุ
  internalNote: text("internal_note"), // หมายเหตุภายใน ลูกค้าไม่เห็น
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const orderItems = sqliteTable("order_items", {
  id: id(),
  orderId: integer("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  containerId: integer("container_id").references(() => containers.id, { onDelete: "set null" }),
  description: text("description").notNull(),
  quantity: integer("quantity"),
  // ยอดรวมจากพัสดุทุกแถวใน item_packages (คำนวณใหม่ทุกครั้งที่บันทึก)
  boxes: integer("boxes"),
  weightKg: real("weight_kg"),
  cbm: real("cbm"),
  receivedAt: timestamp("received_at"), // ถึงโกดังจีน
  outForDeliveryAt: timestamp("out_for_delivery_at"),
  deliveredAt: timestamp("delivered_at"),
  domesticTracking: text("domestic_tracking"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

// พัสดุย่อยของรายการสินค้า: 1 รายการมีได้หลายพัสดุ หลายขนาด
// แต่ละแถว = กล่องขนาดเดียวกัน N กล่อง (cbm = กว้าง × ยาว × สูง × กล่อง ÷ 1,000,000)
export const itemPackages = sqliteTable("item_packages", {
  id: id(),
  itemId: integer("item_id")
    .notNull()
    .references(() => orderItems.id, { onDelete: "cascade" }),
  chinaTrackingNo: text("china_tracking_no"),
  boxes: integer("boxes"),
  weightKg: real("weight_kg"), // น้ำหนักรวมของแถวนี้
  widthCm: real("width_cm"),
  lengthCm: real("length_cm"),
  heightCm: real("height_cm"),
  cbm: real("cbm"),
  createdAt: createdAt(),
});

export const ordersRelations = relations(orders, ({ many }) => ({ items: many(orderItems) }));

export const containersRelations = relations(containers, ({ many }) => ({ items: many(orderItems) }));

export const orderItemsRelations = relations(orderItems, ({ one, many }) => ({
  order: one(orders, { fields: [orderItems.orderId], references: [orders.id] }),
  container: one(containers, { fields: [orderItems.containerId], references: [containers.id] }),
  packages: many(itemPackages),
}));

export const itemPackagesRelations = relations(itemPackages, ({ one }) => ({
  item: one(orderItems, { fields: [itemPackages.itemId], references: [orderItems.id] }),
}));

export type User = typeof users.$inferSelect;
export type Container = typeof containers.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type OrderItem = typeof orderItems.$inferSelect;
export type ItemPackage = typeof itemPackages.$inferSelect;
