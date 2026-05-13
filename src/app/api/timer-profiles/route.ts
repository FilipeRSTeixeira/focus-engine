import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTimerProfiles, getActiveTimerProfile, createTimerProfile } from "@/lib/focus";

const DEFAULT_PROFILES = [
  { name: "Classic Pomodoro", workMinutes: 25, breakMinutes: 5 },
  { name: "Short Session", workMinutes: 15, breakMinutes: 3 },
  { name: "Deep Work", workMinutes: 50, breakMinutes: 10 },
];

// Renames any leftover Portuguese default names to their English equivalents,
// so users with an existing DB don't see mixed languages.
const RENAMES: Record<string, string> = {
  "Pomodoro Clássico": "Classic Pomodoro",
  "Sessão Curta": "Short Session",
};

async function ensureDefaults() {
  const existing = await prisma.timerProfile.count();
  if (existing === 0) {
    // Sequential creation so only the first profile starts active.
    for (let i = 0; i < DEFAULT_PROFILES.length; i++) {
      const p = DEFAULT_PROFILES[i];
      await prisma.timerProfile.create({
        data: {
          name: p.name,
          workMinutes: p.workMinutes,
          breakMinutes: p.breakMinutes,
          isDefault: true,
          isActive: i === 0,
        },
      });
    }
    return;
  }

  // Idempotent rename of older PT defaults.
  for (const [from, to] of Object.entries(RENAMES)) {
    await prisma.timerProfile.updateMany({
      where: { name: from, isDefault: true },
      data: { name: to },
    });
  }
}

export async function GET() {
  await ensureDefaults();
  const profiles = await getTimerProfiles();
  const active = await getActiveTimerProfile();

  return NextResponse.json({ profiles, active });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, workMinutes, breakMinutes, isActive } = body;

    if (!name) {
      return NextResponse.json({ error: "Missing name" }, { status: 400 });
    }

    if (!workMinutes || workMinutes < 1) {
      return NextResponse.json({ error: "Invalid work minutes" }, { status: 400 });
    }

    if (!breakMinutes || breakMinutes < 1) {
      return NextResponse.json({ error: "Invalid break minutes" }, { status: 400 });
    }

    const profile = await createTimerProfile({
      name,
      workMinutes,
      breakMinutes,
      isActive,
    });

    return NextResponse.json({ profile });
  } catch {
    return NextResponse.json({ error: "Failed to create profile" }, { status: 500 });
  }
}
