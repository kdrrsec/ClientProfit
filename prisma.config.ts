import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations", seed: "tsx prisma/seed.ts" },
  // Migrations need a direct connection; Neon (via Vercel) provides DATABASE_URL_UNPOOLED next to the pooled DATABASE_URL.
  datasource: { url: process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL || "" },
});
