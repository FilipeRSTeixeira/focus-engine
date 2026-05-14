import { NextResponse } from "next/server";
import { createHabit, getHabitsWithProgress } from "@/lib/habits";
import { parseHabitBody } from "@/lib/habits-input";

export async function GET() {
  const habits = await getHabitsWithProgress();
  return NextResponse.json(habits);
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = parseHabitBody(body, true);
  if ("error" in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  const habit = await createHabit(parsed);
  return NextResponse.json(habit);
}
