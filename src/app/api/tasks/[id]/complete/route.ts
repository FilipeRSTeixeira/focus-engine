import { NextResponse } from "next/server";
import { completeTask } from "@/lib/tasks";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const result = await completeTask(Number(id));
  if (!result) return NextResponse.json(null);
  const { Project, ...rest } = result.task;
  return NextResponse.json({
    task: { ...rest, project: Project },
    pointsEarned: result.pointsEarned,
    breakdown: result.breakdown,
    newlyUnlocked: result.newlyUnlocked,
  });
}
