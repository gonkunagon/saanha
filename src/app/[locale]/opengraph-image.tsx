import { ImageResponse } from "next/og";

// รูปที่แสดงตอนแชร์ลิงก์ใน LINE / Facebook
// ใช้ข้อความภาษาอังกฤษ เพราะฟอนต์เริ่มต้นของ next/og ไม่มีตัวอักษรไทย
export const alt = "SAANHA — China sourcing, payment & shipping to Thailand";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const red = "#b91c1c";

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 96px",
          background: "linear-gradient(180deg, #fef2f2 0%, #ffffff 100%)",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", maxWidth: 640 }}>
          <div style={{ fontSize: 96, fontWeight: 800, color: red }}>SAANHA</div>
          <div style={{ fontSize: 44, fontWeight: 700, color: "#1f2937", marginTop: 12 }}>
            China → Thailand, all in one place
          </div>
          <div style={{ fontSize: 30, color: "#4b5563", marginTop: 24 }}>
            Sourcing · Supplier payment · CNY · Truck & sea freight
          </div>
        </div>
        <div
          style={{
            width: 300,
            height: 300,
            borderRadius: 150,
            background: "#fee2e2",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg width="180" height="180" viewBox="0 0 24 24" fill="none" stroke={red} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z" />
            <path d="M4 7.5l8 4.5 8-4.5M12 12v9" />
          </svg>
        </div>
      </div>
    ),
    size,
  );
}
