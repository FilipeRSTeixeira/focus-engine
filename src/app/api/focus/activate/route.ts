import { NextResponse } from "next/server";
import { setActiveTask } from "@/lib/focus";

export async function POST(request: Request) {
  const body = await request.json();
  const { taskId } = body;

  if (!taskId) {
    return NextResponse.json({ error: "Missing taskId" }, { status: 400 });
  }

  await setActiveTask(taskId);
  return NextResponse.json({ ok: true });
}
