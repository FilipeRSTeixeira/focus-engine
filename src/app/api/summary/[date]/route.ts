import { NextResponse } from "next/server";
import { generateDailySummary, upsertDailySummary } from "@/lib/daily";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ date: string }> }
) {
  const { date } = await params;
  const parsed = new Date(date);

  if (isNaN(parsed.getTime())) {
    return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  }

  const summary = await generateDailySummary(parsed);
  return NextResponse.json(summary);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ date: string }> }
) {
  const { date } = await params;
  const parsed = new Date(date);

  if (isNaN(parsed.getTime())) {
    return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  }

  const body = await request.json();
  const summary = await upsertDailySummary(parsed, body);
  return NextResponse.json(summary);
}
