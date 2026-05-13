import { NextResponse } from "next/server";
import { getCurrentLevelInfo } from "@/lib/levels";

export async function GET() {
  try {
    const info = await getCurrentLevelInfo();
    return NextResponse.json(info);
  } catch (error) {
    console.error("Level API error:", error);
    return NextResponse.json({
      level: 1,
      tier: "Newcomer",
      color: "#71717a",
      totalXp: 0,
      xpInLevel: 0,
      xpForCurrentLevel: 50,
      xpToNext: 50,
      progress: 0,
    });
  }
}
