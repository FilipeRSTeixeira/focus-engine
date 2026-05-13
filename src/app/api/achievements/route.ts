import { NextResponse } from "next/server";
import { listAchievements } from "@/lib/achievements";

export async function GET() {
  try {
    const items = await listAchievements();
    const unlocked = items.filter((i) => i.unlocked).length;
    return NextResponse.json({
      items,
      unlockedCount: unlocked,
      totalCount: items.length,
    });
  } catch (error) {
    console.error("Achievements API error:", error);
    return NextResponse.json({ items: [], unlockedCount: 0, totalCount: 0 });
  }
}
