import { defineConfig } from "drizzle-kit";

export default defineConfig({
  out: "./src/db/mirgrations",
  schema: "./src/db/schemas/*",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL as string,
  },
  verbose: true,
  strict: true,
});
