import { Noto_Sans_Thai, Sarabun } from "next/font/google";

// ฟอนต์หลักทั้งเว็บและหลังบ้าน
export const sarabun = Sarabun({
  subsets: ["thai", "latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-sarabun",
});

// ใช้เฉพาะคำว่า SAANHA ในโลโก้ (คงหน้าตาโลโก้เดิม)
export const logoFont = Noto_Sans_Thai({ subsets: ["latin"], weight: ["800"], variable: "--font-noto-logo" });

export const fontVariables = `${sarabun.variable} ${logoFont.variable}`;
