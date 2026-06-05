import { NextResponse } from "next/server";
import { sendCheckinReminders, sendPostStayFollowups } from "@/lib/email-triggers";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

function checkAuth(request: Request): boolean {
  const auth = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return true;
  if (!auth || !auth.startsWith("Bearer ")) return false;
  return auth.slice(7) === cronSecret;
}

export async function GET(request: Request) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const reminders = await sendCheckinReminders();
  const followups = await sendPostStayFollowups();
  return NextResponse.json({
    ok: true,
    checkinReminders: reminders,
    postStayFollowups: followups,
  });
}
