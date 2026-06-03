import { NextResponse } from "next/server";
import {
  upsertRooms,
  replaceSeasons,
  replaceMealPlans,
  replacePropertyConfig,
  replaceBlockedDates,
  logSync,
} from "@/lib/db";

const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_URL;

interface AppsScriptRoom {
  Room_ID: string;
  Room_Type: string;
  Total_Units: string;
  basePrice: number;
  currentPrice: number;
  Max_Adults?: string;
  Max_Children?: string;
  Child_Policy?: string;
}

interface AppsScriptSeason {
  Start_Date: string;
  End_Date: string;
  Multiplier: string;
}

interface AppsScriptMealPlan {
  Code: string;
  Name: string;
  Price: string;
}

interface AppsScriptData {
  property: Record<string, string>;
  rooms: AppsScriptRoom[];
  seasons: AppsScriptSeason[];
  mealPlans: AppsScriptMealPlan[];
  calendars: { Room_ID: string; Calendar_ID: string }[];
  blockedDates: Record<string, string[]>;
}

/**
 * POST /api/pms/sync
 *
 * Triggers a sync from Google Sheets → Neon.
 * Called by Vercel Cron every 5 minutes, or manually by the owner.
 * Body (optional): { token: "your-secret" }
 */
export async function POST(request: Request) {
  try {
    if (!APPS_SCRIPT_URL) {
      return NextResponse.json(
        { error: "APPS_SCRIPT_URL not configured" },
        { status: 500 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const token = body.token || process.env.APPS_SCRIPT_TOKEN;
    if (!token) {
      return NextResponse.json(
        { error: "Sync token required" },
        { status: 401 }
      );
    }

    // Fetch from Google Apps Script
    const res = await fetch(`${APPS_SCRIPT_URL}?token=${token}`);
    if (!res.ok) {
      throw new Error(`Apps Script returned ${res.status}`);
    }
    const data: AppsScriptData = await res.json();

    // Upsert into Neon
    await Promise.all([
      upsertRooms(
        data.rooms.map((r) => ({
          id: parseInt(r.Room_ID),
          name: r.Room_Type,
          units: parseInt(r.Total_Units) || 1,
          base_price: r.basePrice,
          max_adults: parseInt(r.Max_Adults || "2") || 2,
          max_children: parseInt(r.Max_Children || "2") || 2,
          child_policy: r.Child_Policy || "",
        }))
      ),
      replaceSeasons(
        data.seasons.map((s) => ({
          start_date: s.Start_Date,
          end_date: s.End_Date,
          multiplier: parseFloat(s.Multiplier) || 1,
        }))
      ),
      replaceMealPlans(
        data.mealPlans.map((m) => ({
          code: m.Code,
          name: m.Name,
          price: parseInt(String(m.Price).replace(/,/g, "")) || 0,
        }))
      ),
      replacePropertyConfig(data.property),
      replaceBlockedDates(data.blockedDates),
    ]);

    await logSync("success", `Synced ${data.rooms.length} rooms`);

    return NextResponse.json({
      ok: true,
      rooms: data.rooms.length,
      seasons: data.seasons.length,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    await logSync("error", msg);
    console.error("[PMS] Sync error:", msg);

    // Check if it's the Apps Script setStatusCode bug
    if (msg.includes("setStatusCode") || msg.includes("is not a function")) {
      return NextResponse.json({
        error: "Apps Script needs redeploying. Open your sheet → Extensions → Apps Script → Deploy → Manage Deployments → Edit → Deploy the latest Code.gs from scripts/pms/Code.gs",
        hint: "Copy scripts/pms/Code.gs content into the Apps Script editor, save, then deploy as Web App (Execute as: Me, Access: Anyone)",
      }, { status: 500 });
    }

    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
