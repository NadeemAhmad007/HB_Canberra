import { NextResponse } from "next/server";
import {
  upsertRooms,
  replaceSeasons,
  replaceMealPlans,
  replacePropertyConfig,
  logSync,
} from "@/lib/db";

const SEED = {
  rooms: [
    { id: 1, name: "Deluxe Room", units: 2, base_price: 11500, max_adults: 2, max_children: 2, child_policy: "1 child above 10, 2 children below 10" },
    { id: 3, name: "Family Suite", units: 1, base_price: 24500, max_adults: 4, max_children: 2, child_policy: "2 children below 12" },
  ],
  seasons: [
    { start_date: "2026-04-01", end_date: "2026-09-30", multiplier: 1.0 },
    { start_date: "2026-10-01", end_date: "2027-03-31", multiplier: 1.4 },
  ],
  meals: [
    { code: "EP", name: "European Plan (Room only)", price: 0 },
    { code: "CP", name: "Continental Plan (Breakfast only)", price: 650 },
    { code: "MAP", name: "Modified American Plan (Breakfast + Dinner)", price: 1800 },
    { code: "AP", name: "American Plan (All meals)", price: 3200 },
  ],
  property: { NAME: "Houseboat Canberra", GST: "18", ADDRESS: "Dal Lake, Srinagar", CURRENCY: "INR" },
};

/**
 * POST /api/pms/sync
 * Seeds or refreshes Neon with the default room/rate/meal data.
 * Called manually or by Vercel Cron.
 */
export async function POST() {
  try {
    await Promise.all([
      upsertRooms(SEED.rooms),
      replaceSeasons(SEED.seasons),
      replaceMealPlans(SEED.meals),
      replacePropertyConfig(SEED.property),
    ]);

    await logSync("success", `Seeded ${SEED.rooms.length} rooms`);

    return NextResponse.json({ ok: true, rooms: SEED.rooms.length, seasons: SEED.seasons.length });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    await logSync("error", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
