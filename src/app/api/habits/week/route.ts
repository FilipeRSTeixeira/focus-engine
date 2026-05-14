import { NextResponse } from "next/server";
import { getHabitsWeekSummary } from "@/lib/habits";

export async function GET() {
  const summary = await getHabitsWeekSummary();
  return NextResponse.json(summary);
}
