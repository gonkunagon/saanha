// ข้อมูลติดต่อของบริษัท — แก้ไขที่นี่ที่เดียว แล้วจะแสดงทั่วทั้งเว็บ
export const site = {
  name: "SAANHA",
  url: "https://saanha.com", // ใช้กับ sitemap และรูปตอนแชร์ลิงก์
  phone: "095-956-9666",
  lineId: "@saanha", // LINE OA "SAANHA สรรหา" (basic ID @540tsqtl)
  lineUrl: "https://line.me/R/ti/p/%40saanha", // ลิงก์เพิ่มเพื่อน — แก้ให้ตรงกับ lineId
  email: "contract.saanha@gmail.com",
  // ซ่อนไว้ก่อน (ไม่แสดงบนเว็บและใบเสนอราคา) — เปลี่ยนเป็น true เมื่อพร้อมแสดง
  showEmail: true,
  showAddress: false,
  address: {
    th: "199/23 ถนนกัลปพฤกษ์ แขวงบางขุนเทียน เขตจอมทอง กรุงเทพมหานคร 10150",
    en: "199/23 Kanlapaphruek Rd., Bang Khun Thian, Chom Thong, Bangkok 10150",
  },
};
