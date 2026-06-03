const { neon } = require("@neondatabase/serverless");
const sql = neon("postgresql://neondb_owner:npg_ZHQbDWTMi31n@ep-delicate-morning-ao2pock5-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require");

async function run() {
  console.log("Running migration 002_add_capacity...");
  await sql`ALTER TABLE rooms ADD COLUMN IF NOT EXISTS max_adults INT NOT NULL DEFAULT 2`;
  console.log("  rooms.max_adults OK");
  await sql`ALTER TABLE rooms ADD COLUMN IF NOT EXISTS max_children INT NOT NULL DEFAULT 2`;
  console.log("  rooms.max_children OK");
  await sql`ALTER TABLE rooms ADD COLUMN IF NOT EXISTS child_policy TEXT NOT NULL DEFAULT ''`;
  console.log("  rooms.child_policy OK");
  await sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS children INT NOT NULL DEFAULT 0`;
  console.log("  bookings.children OK");
  await sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS units INT NOT NULL DEFAULT 1`;
  console.log("  bookings.units OK");
  console.log("Migration complete");
}

run().catch((e) => {
  console.error("Migration failed:", e.message);
  process.exit(1);
});
