import { NextResponse } from "next/server";
import { seedMustReadPapers } from "@/lib/mustread";

export async function POST() {
  try {
    const added = await seedMustReadPapers();
    return NextResponse.json({ added });
  } catch (error) {
    console.error("[POST /api/seed]", error);
    return NextResponse.json({ error: "Seed failed" }, { status: 500 });
  }
}
