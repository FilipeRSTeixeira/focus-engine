import { NextResponse } from "next/server";
import { getRewards, createReward, expireRewards } from "@/lib/rewards";

export async function GET() {
  // Sweep expired rewards on every load so the list stays accurate
  // without needing a background worker for this single-user app.
  await expireRewards();
  const rewards = await getRewards();
  return NextResponse.json(rewards);
}

const ALLOWED_DURATIONS = new Set(["min5", "min15", "min30", "hour1"]);
const ALLOWED_TYPES = new Set(["points"]);

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
  const { title, pointCost, type, rewardDuration, expiresAt } = body as {
    title?: unknown;
    pointCost?: unknown;
    type?: unknown;
    rewardDuration?: unknown;
    expiresAt?: unknown;
  };
  if (typeof title !== "string" || !title.trim()) {
    return NextResponse.json({ error: "Missing or invalid title" }, { status: 400 });
  }
  if (typeof pointCost !== "number" || !Number.isInteger(pointCost) || pointCost < 1) {
    return NextResponse.json({ error: "pointCost must be a positive integer" }, { status: 400 });
  }
  if (type !== undefined && (typeof type !== "string" || !ALLOWED_TYPES.has(type))) {
    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  }
  if (rewardDuration !== undefined && (typeof rewardDuration !== "string" || !ALLOWED_DURATIONS.has(rewardDuration))) {
    return NextResponse.json({ error: "Invalid rewardDuration" }, { status: 400 });
  }
  let expires: Date | undefined;
  if (expiresAt !== undefined && expiresAt !== null) {
    const parsed = new Date(expiresAt as string);
    if (isNaN(parsed.getTime())) {
      return NextResponse.json({ error: "Invalid expiresAt" }, { status: 400 });
    }
    expires = parsed;
  }
  const reward = await createReward({
    title: title.trim(),
    pointCost,
    type: type as string | undefined,
    rewardDuration: rewardDuration as string | undefined,
    expiresAt: expires,
  });
  return NextResponse.json(reward);
}
