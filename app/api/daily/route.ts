import { NextRequest, NextResponse } from "next/server";
import { runDailyCheck } from "@/lib/daily";

export const maxDuration = 300;

export async function GET(request: NextRequest) {
  const auth = request.headers.get("Authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runDailyCheck();
    return NextResponse.json(result);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[GET /api/daily]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
