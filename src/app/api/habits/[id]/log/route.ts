import { NextResponse } from "next/server";
import { logHabit } from "@/lib/habits";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const numId = Number(id);
  if (!Number.isInteger(numId) || numId < 1) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const b = (body ?? {}) as { value?: unknown; date?: unknown };
  if (typeof b.value !== "number" || !Number.isFinite(b.value) || b.value < 0) {
    return NextResponse.json(
      { error: "value must be a non-negative number" },
      { status: 400 }
    );
  }
  let date: Date | undefined;
  if (b.date !== undefined && b.date !== null) {
    const parsed = new Date(b.date as string);
    if (isNaN(parsed.getTime())) {
      return NextResponse.json({ error: "Invalid date" }, { status: 400 });
    }
    date = parsed;
  }
  try {
    const result = await logHabit(numId, b.value, date);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to log habit" },
      { status: 400 }
    );
  }
}
