import { NextResponse } from "next/server";
import { getRewards, createReward, expireRewards } from "@/lib/rewards";

export async function GET() {
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
  const { title, pointCost, type, rewardDuration, expiresAt, weeklyLimit, category } = body as {
    title?: unknown;
    pointCost?: unknown;
    type?: unknown;
    rewardDuration?: unknown;
    expiresAt?: unknown;
    weeklyLimit?: unknown;
    category?: unknown;
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
  let limit: number | null | undefined;
  if (weeklyLimit !== undefined) {
    if (weeklyLimit === null) {
      limit = null;
    } else if (typeof weeklyLimit === "number" && Number.isInteger(weeklyLimit) && weeklyLimit >= 1) {
      limit = weeklyLimit;
    } else {
      return NextResponse.json({ error: "weeklyLimit must be a positive integer or null" }, { status: 400 });
    }
  }
  let cat: string | null | undefined;
  if (category !== undefined) {
    if (category === null || category === "") {
      cat = null;
    } else if (typeof category === "string") {
      cat = category.trim();
    } else {
      return NextResponse.json({ error: "Invalid category" }, { status: 400 });
    }
  }
  const reward = await createReward({
    title: title.trim(),
    pointCost,
    type: type as string | undefined,
    rewardDuration: rewardDuration as string | undefined,
    expiresAt: expires,
    weeklyLimit: limit,
    category: cat,
  });
  return NextResponse.json(reward);
}
