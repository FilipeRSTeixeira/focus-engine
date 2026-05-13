import { NextResponse } from "next/server";
import { activateReward } from "@/lib/rewards";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const result = await activateReward(Number(id));
  return NextResponse.json(result);
}
