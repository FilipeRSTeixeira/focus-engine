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
  });
  return NextResponse.json(updated);
}
