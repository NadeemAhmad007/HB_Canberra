import { NextResponse } from "next/server";
import { getMonthAvailability } from "@/lib/db";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const roomId = parseInt(url.searchParams.get("roomId") || "");
  const year = parseInt(url.searchParams.get("year") || String(new Date().getFullYear()));
  const month = parseInt(url.searchParams.get("month") || String(new Date().getMonth() + 1));

  if (!roomId) {
    return NextResponse.json({ error: "roomId required" }, { status: 400 });
  }

  try {
    const data = await getMonthAvailability(roomId, year, month);
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch availability" }, { status: 500 });
  }
}
