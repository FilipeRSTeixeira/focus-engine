import { NextResponse } from "next/server";
import { getActiveSession, hasActiveTask, getTaskWithProject } from "@/lib/focus";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const taskId = searchParams.get("taskId");

  const activeSession = await getActiveSession();
  if (activeSession) {
    return NextResponse.json({ activeSession: true, message: "You already have an active session" });
  }

  const hasActive = await hasActiveTask();
  if (hasActive) {
    return NextResponse.json({ activeTask: true, message: "You already have an active session" });
  }

  if (!taskId) {
    return NextResponse.json({ ready: true });
  }

  const data = await getTaskWithProject(Number(taskId));
  if (!data) {
    return NextResponse.json({ notFound: true });
  }

  const { Project, ...rest } = data;
  return NextResponse.json({ ready: true, task: { ...rest, project: Project } });
}
