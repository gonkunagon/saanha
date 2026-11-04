import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // อัปโหลดรูปสินค้าผ่าน server action (หลายรูปต่อครั้ง รูปจากมือถือใหญ่ได้) — ค่าเริ่มต้นแค่ 1MB
  experimental: { serverActions: { bodySizeLimit: "25mb" } },
};

export default nextConfig;
