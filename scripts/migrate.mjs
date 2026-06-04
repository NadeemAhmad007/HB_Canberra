/**
 * Migration script — applies all SQL files in migrations/ sequentially.
 * Run: node scripts/migrate.mjs
 * Requires DATABASE_URL env var to be set.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const { Client } = pg;

const __dirname = dirname(fileURLToPath(import.meta.url));
const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

const client = new Client({ connectionString: url });
await client.connect();

const migrationsDir = join(__dirname, "..", "migrations");
const files = readdirSync(migrationsDir)
  .filter((f) => f.endsWith(".sql"))
  .sort();

for (const file of files) {
  const sql = readFileSync(join(migrationsDir, file), "utf-8");
  try {
    await client.query(sql);
    console.log(`✓ ${file} applied`);
  } catch (err) {
    console.error(`✗ ${file} failed: ${err.message}`);
  }
}

await client.end();
console.log("Done.");
