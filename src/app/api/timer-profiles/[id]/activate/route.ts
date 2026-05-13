import { NextResponse } from "next/server";
import { activateTimerProfile } from "@/lib/focus";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const id = Number((await params).id);
    if (!Number.isFinite(id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }
    const profile = await activateTimerProfile(id);
    return NextResponse.json({ profile });
  } catch {
    return NextResponse.json({ error: "Failed to activate profile" }, { status: 500 });
  }
}
