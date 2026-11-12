import type { Metadata } from "next";
import { fontVariables } from "../fonts";
import "../globals.css";
import { NoWheelNumbers } from "@/components/admin/NoWheelNumbers";

export const metadata: Metadata = {
  title: "SAANHA หลังบ้าน",
  robots: { index: false, follow: false },
};

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th" className={fontVariables}>
      <body className="min-h-screen bg-gray-50 font-sans">
        <NoWheelNumbers />
        {children}
      </body>
    </html>
  );
}
