import { existsSync, readFileSync } from "node:fs";
import { defineConfig } from "drizzle-kit";

function readEnvValue(filePath: string, key: string) {
  if (!existsSync(filePath)) {
    return undefined;
  }

  const lines = readFileSync(filePath, "utf8").split(/\r?\n/);
  const match = lines.find((line) => line.trim().startsWith(`${key}=`));

  return match
    ?.slice(key.length + 1)
    .trim()
    .replace(/^["']|["']$/g, "");
}

const databaseUrl =
  process.env.DATABASE_URL ??
  readEnvValue(".env.local", "DATABASE_URL") ??
  readEnvValue(".env", "DATABASE_URL");

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required for Drizzle.");
}

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl,
  },
});
