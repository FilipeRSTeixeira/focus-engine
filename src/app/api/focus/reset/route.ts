import { NextResponse } from "next/server";
import { createFocusSession, resetTaskStatus } from "@/lib/focus";

export async function POST(request: Request) {
  const body = await request.json();
  const { taskId, durationMinutes, type, note, focusLost } = body;

  if (!taskId || !durationMinutes) {
    return NextResponse.json({ error: "Missing taskId or duration" }, { status: 400 });
  }

  await createFocusSession({
    taskId,
    durationMinutes,
    type: type || "work",
    note,
    focusLost: focusLost || false,
  });

  await resetTaskStatus(taskId);

  return NextResponse.json({ ok: true });
}
