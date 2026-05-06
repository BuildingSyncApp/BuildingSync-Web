import { config as loadEnv } from "dotenv";
import { defineConfig } from "prisma/config";

// Next.js uses .env.local, but dotenv only auto-loads .env. Load explicitly.
loadEnv({ path: ".env.local" });
loadEnv({ path: ".env" });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL!,
  },
});
