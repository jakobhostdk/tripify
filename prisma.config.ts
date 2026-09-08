import { defineConfig } from "@prisma/config";

// Prisma 7 no longer auto-loads .env for config files.
try {
  process.loadEnvFile?.();
} catch {
  // .env is optional — env may be supplied directly (e.g. in containers).
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: process.env.DATABASE_URL,
  },
  migrations: {
    path: "prisma/migrations",
  },
});
