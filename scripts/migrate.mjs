/**
 * One-time migration script using direct postgres connection.
 * Run: node scripts/migrate.mjs
 * Requires DATABASE_URL env var to be set.
 */
import { readFileSync } from "node:fs";
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

const migration = readFileSync(
  join(__dirname, "..", "migrations", "001_initial.sql"),
  "utf-8"
);

try {
  await client.query(migration);
  console.log("✓ Migration applied successfully");
} catch (err) {
  console.error("Migration error:", err.message);
}

await client.end();
