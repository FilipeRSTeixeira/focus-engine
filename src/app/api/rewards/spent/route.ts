import { NextResponse } from "next/server";
import { getTodaySpent } from "@/lib/rewards";

export async function GET() {
  const spent = await getTodaySpent();
  return NextResponse.json({ spent });
}
