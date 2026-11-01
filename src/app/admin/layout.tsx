import type { Metadata } from "next";
import { Noto_Sans_Thai } from "next/font/google";
import "../globals.css";

const notoThai = Noto_Sans_Thai({ subsets: ["thai", "latin"], variable: "--font-noto-thai" });

export const metadata: Metadata = {
  title: "SAANHA หลังบ้าน",
  robots: { index: false, follow: false },
};

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th" className={notoThai.variable}>
      <body className="min-h-screen bg-gray-50 font-sans">{children}</body>
    </html>
  );
}
