import { NextResponse } from "next/server";

// Auto-fetch has been removed. Papers are fetched manually via the "Run Now" button.
// This route is kept as a stub so existing references don't 404.
export async function GET() {
  return NextResponse.json(
    { message: "Automatic daily fetch has been removed. Use the Run Now button on the home page." },
    { status: 410 }
  );
}
