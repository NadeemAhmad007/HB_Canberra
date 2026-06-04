import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

interface Check {
  name: string;
  table: string;
  column: string;
  required: boolean;
}

const MIGRATIONS: { name: string; checks: Check[] }[] = [
  {
    name: "001_initial.sql",
    checks: [
      { name: "rooms",          table: "rooms",          column: "id",         required: true },
      { name: "bookings",       table: "bookings",       column: "id",         required: true },
      { name: "blocked_dates",  table: "blocked_dates",  column: "room_id",    required: true },
      { name: "settings",       table: "settings",       column: "key",        required: true },
    ],
  },
  {
    name: "002_add_capacity.sql",
    checks: [
      { name: "rooms.max_adults",       table: "rooms",    column: "max_adults",    required: true },
      { name: "rooms.max_children",     table: "rooms",    column: "max_children",  required: true },
      { name: "bookings.children",      table: "bookings", column: "children",      required: true },
      { name: "bookings.units",         table: "bookings", column: "units",         required: true },
    ],
  },
  {
    name: "003_pms_upgrade.sql",
    checks: [
      { name: "guests",          table: "guests",          column: "email",      required: true },
      { name: "activity_log",    table: "activity_log",    column: "action",     required: true },
      { name: "notifications",   table: "notifications",   column: "id",         required: false },
      { name: "settings",        table: "settings",        column: "value",      required: true },
      { name: "room_images",     table: "room_images",     column: "id",         required: false },
      { name: "rooms.active",    table: "rooms",           column: "active",     required: true },
      { name: "rooms.status",    table: "rooms",           column: "status",     required: true },
    ],
  },
  {
    name: "004_enterprise_upgrade.sql",
    checks: [
      { name: "users",                  table: "users",                  column: "id",              required: false },
      { name: "email_templates",        table: "email_templates",        column: "trigger_event",  required: false },
      { name: "housekeeping_tasks",     table: "housekeeping_tasks",     column: "task_type",      required: true },
      { name: "invoices",               table: "invoices",               column: "invoice_no",     required: true },
      { name: "bookings.notes",         table: "bookings",               column: "notes",          required: true },
      { name: "bookings.tc_accepted",   table: "bookings",               column: "tc_accepted",    required: true },
      { name: "bookings.checkin_at",    table: "bookings",               column: "checkin_at",     required: true },
      { name: "bookings.checkout_at",   table: "bookings",               column: "checkout_at",    required: true },
      { name: "bookings.id_proof",      table: "bookings",               column: "id_proof",       required: true },
    ],
  },
  {
    name: "005_per_unit_blocking.sql",
    checks: [
      { name: "blocked_dates.unit_index", table: "blocked_dates", column: "unit_index", required: true },
    ],
  },
  {
    name: "006_payment_gateways.sql",
    checks: [
      { name: "bookings.payment_status",  table: "bookings", column: "payment_status",  required: true },
      { name: "bookings.payment_gateway", table: "bookings", column: "payment_gateway", required: true },
      { name: "bookings.payment_id",      table: "bookings", column: "payment_id",      required: true },
      { name: "bookings.payment_data",    table: "bookings", column: "payment_data",    required: false },
    ],
  },
  {
    name: "007_payments_and_enhancements.sql",
    checks: [
      { name: "payments",                 table: "payments",  column: "id",          required: true },
      { name: "bookings.amount_paid",     table: "bookings",  column: "amount_paid", required: true },
      { name: "bookings.deposit_required",table: "bookings",  column: "deposit_required", required: false },
      { name: "bookings.deposit_amount",  table: "bookings",  column: "deposit_amount", required: false },
    ],
  },
  {
    name: "008_audit_trail_columns.sql",
    checks: [
      { name: "invoices.updated_at",      table: "invoices",      column: "updated_at", required: true },
      { name: "blocked_dates.updated_at", table: "blocked_dates", column: "updated_at", required: true },
      { name: "payments.updated_at",      table: "payments",      column: "updated_at", required: true },
    ],
  },
];

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  const password = process.env.ADMIN_PASSWORD;
  if (password) {
    if (!auth || !auth.startsWith("Bearer ") || auth.slice(7) !== password) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const results: any[] = [];
  for (const m of MIGRATIONS) {
    const checks: { name: string; ok: boolean; required: boolean; error?: string }[] = [];
    for (const c of m.checks) {
      try {
        const r = await query(
          `SELECT column_name FROM information_schema.columns
            WHERE table_schema='public' AND table_name=$1 AND column_name=$2`,
          [c.table, c.column]
        ) as { rows: Array<{ column_name: string }> };
        if (r.rows.length > 0) {
          checks.push({ name: c.name, ok: true, required: c.required });
        } else {
          // Maybe the table is missing
          const t = await query(
            `SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=$1`,
            [c.table]
          );
          if (t.rows.length === 0) {
            checks.push({ name: `${c.name} (table ${c.table} missing)`, ok: false, required: c.required });
          } else {
            checks.push({ name: `${c.name} (column missing)`, ok: false, required: c.required });
          }
        }
      } catch (e: any) {
        checks.push({ name: c.name, ok: false, required: c.required, error: e.message });
      }
    }
    const allOk = checks.filter((c) => c.required).every((c) => c.ok);
    results.push({ migration: m.name, applied: allOk, checks });
  }

  const totalApplied = results.filter((r) => r.applied).length;
  const allApplied = totalApplied === MIGRATIONS.length;

  return NextResponse.json({
    totalMigrations: MIGRATIONS.length,
    applied: totalApplied,
    allApplied,
    results,
    recommendation: allApplied
      ? "All migrations applied — full PMS features available."
      : "Run missing migrations in the migrations/ folder in order (001 → 008) on your Neon database.",
  });
}
