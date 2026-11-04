import { defineConfig } from "drizzle-kit";

// อ่าน DATABASE_URL จาก .env.local (Supabase Postgres)
process.loadEnvFile?.(".env.local");

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url: process.env.DATABASE_URL! },
});
