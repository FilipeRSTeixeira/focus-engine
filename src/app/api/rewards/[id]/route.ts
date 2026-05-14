import { NextResponse } from "next/server";
import { deleteReward, updateReward } from "@/lib/rewards";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const numId = Number(id);
  if (!Number.isInteger(numId) || numId < 1) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }
  await deleteReward(numId);
  return NextResponse.json({ ok: true });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const numId = Number(id);
  if (!Number.isInteger(numId) || numId < 1) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }
  const body = await request.json();
  const expiresAt =
    body.expiresAt === undefined
      ? undefined
      : body.expiresAt === null || body.expiresAt === ""
        ? null
        : new Date(body.expiresAt);

  let weeklyLimit: number | null | undefined;
  if (body.weeklyLimit !== undefined) {
    if (body.weeklyLimit === null || body.weeklyLimit === "") {
      weeklyLimit = null;
    } else {
      const n = Number(body.weeklyLimit);
      if (!Number.isInteger(n) || n < 1) {
        return NextResponse.json({ error: "weeklyLimit must be a positive integer or null" }, { status: 400 });
      }
      weeklyLimit = n;
    }
  }

  let category: string | null | undefined;
  if (body.category !== undefined) {
    if (body.category === null || body.category === "") {
      category = null;
    } else if (typeof body.category === "string") {
      category = body.category.trim();
    }
  }

  const updated = await updateReward(numId, {
    title: typeof body.title === "string" ? body.title : undefined,
    pointCost:
      body.pointCost === undefined || body.pointCost === null || body.pointCost === ""
        ? undefined
        : Number(body.pointCost),
    type: typeof body.type === "string" ? body.type : undefined,
    rewardDuration:
      typeof body.rewardDuration === "string" ? body.rewardDuration : undefined,
    expiresAt,
    weeklyLimit,
    category,
  });
  return NextResponse.json(updated);
}
