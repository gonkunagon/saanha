import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

// รูปที่แสดงตอนแชร์ลิงก์ใน LINE / Facebook: รูปหน้าแรกเป็นพื้นหลัง + การ์ดโลโก้ SAANHA ฝั่งขวา
// ใช้ข้อความภาษาอังกฤษ เพราะฟอนต์เริ่มต้นของ next/og ไม่มีตัวอักษรไทย
// ไฟล์ใน src/assets/og/ ทำจาก logo/*.png (ตัดขอบ + พื้นโปร่งใส) และ src/assets/hero.webp (next/og อ่าน webp ไม่ได้ จึงแปลงเป็น jpg/png ไว้)
export const alt = "SAANHA — China sourcing, supplier payment & shipping to Thailand";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const asset = async (name: string, mime: string) =>
  `data:${mime};base64,${(await readFile(join(process.cwd(), "src/assets/og", name))).toString("base64")}`;

export default async function OgImage() {
  const [bg, logo] = await Promise.all([asset("bg.jpg", "image/jpeg"), asset("logo.png", "image/png")]);

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", position: "relative", fontFamily: "sans-serif" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={bg} width={1200} height={630} style={{ position: "absolute", top: 0, left: 0 }} alt="" />
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: 1200,
            height: 630,
            display: "flex",
            background: "linear-gradient(90deg, rgba(2,6,23,0) 30%, rgba(2,6,23,0.55) 100%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            right: 56,
            top: 150,
            width: 600,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            padding: "44px 40px 36px",
            borderRadius: 32,
            background: "#ffffff",
            boxShadow: "0 20px 50px rgba(0,0,0,0.35)",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logo} width={520} height={116} alt="SAANHA" />
          <div style={{ marginTop: 26, fontSize: 34, color: "#1f2937" }}>China → Thailand, all in one place</div>
          <div style={{ marginTop: 12, fontSize: 22, color: "#4b5563" }}>Sourcing · Supplier payment · Shipping</div>
        </div>
      </div>
    ),
    size,
  );
}
