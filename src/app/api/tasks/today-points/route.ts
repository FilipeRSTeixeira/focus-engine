import { NextResponse } from "next/server";
import { getTodayPoints } from "@/lib/tasks";
import { calculateStreak } from "@/lib/streak";

export async function GET() {
  const [points, streak] = await Promise.all([
    getTodayPoints(),
    calculateStreak(),
  ]);
  return NextResponse.json({ points, streak });
}
