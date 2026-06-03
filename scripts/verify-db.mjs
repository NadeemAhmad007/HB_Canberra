import { neon } from "@neondatabase/serverless";
import pg from "pg";
const { Client } = pg;

const client = new Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

const { rows: tables } = await client.query(
  "SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name"
);
console.log("Tables:", tables.map(t => t.table_name).join(", "));

for (const t of tables) {
  const { rows } = await client.query(`SELECT COUNT(*)::int as cnt FROM "${t.table_name}"`);
  console.log(`  ${t.table_name}: ${rows[0].cnt} rows`);
}

await client.end();
