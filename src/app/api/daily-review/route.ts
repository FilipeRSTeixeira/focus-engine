import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { startOfUtcDay } from "@/lib/date";

const ALLOWED_DISTRACTIONS = new Set([
  "phone",
  "curiosity",
  "other-people",
  "environment",
  "fatigue",
  "other",
]);

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  const { wentWell, distractions, energyLevel } = body as {
    wentWell?: unknown;
    distractions?: unknown;
    energyLevel?: unknown;
  };
  if (typeof wentWell !== "string" || !wentWell.trim()) {
    return NextResponse.json({ error: "wentWell is required" }, { status: 400 });
  }
  if (
    typeof energyLevel !== "number" ||
    !Number.isInteger(energyLevel) ||
    energyLevel < 1 ||
    energyLevel > 5
  ) {
    return NextResponse.json({ error: "energyLevel must be 1-5" }, { status: 400 });
  }
  if (!Array.isArray(distractions) || !distractions.every((d): d is string => typeof d === "string")) {
    return NextResponse.json({ error: "distractions must be a string array" }, { status: 400 });
  }
  const filtered = distractions.filter((d) => ALLOWED_DISTRACTIONS.has(d));

  const today = startOfUtcDay();

  const summary = await prisma.dailySummary.upsert({
    where: { date: today },
    create: {
      date: today,
      reflection_note: wentWell.trim(),
      distractions: filtered.join(","),
      energy_level: energyLevel,
    },
    update: {
      reflection_note: wentWell.trim(),
      distractions: filtered.join(","),
      energy_level: energyLevel,
    },
  });

  return NextResponse.json(summary);
}

export async function GET() {
  const reviews = await prisma.dailySummary.findMany({
    where: {
      reflection_note: { not: null },
    },
    orderBy: { date: "desc" },
    take: 7,
    select: {
      date: true,
      reflection_note: true,
      distractions: true,
      energy_level: true,
      tasks_completed: true,
    },
  });

  return NextResponse.json(reviews);
}
