import { NextResponse } from "next/server";
import { getTasks, createTask, setTaskGoogleEventId } from "@/lib/tasks";
import { createCalendarEvent, isConnected } from "@/lib/google-calendar";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tasks = await getTasks({
    projectId: searchParams.get("projectId") ? Number(searchParams.get("projectId")) : undefined,
    status: searchParams.get("status") || undefined,
    priority: searchParams.get("priority") || undefined,
    energy: searchParams.get("energy") || undefined,
  });
  const transformed = tasks.map(({ Project, ...rest }) => ({ ...rest, project: Project }));
  return NextResponse.json(transformed);
}

export async function POST(request: Request) {
  const body = await request.json();
  const task = await createTask(body);
  const { Project, ...rest } = task;

  // Sync to Google Calendar if connected.
  // Fire-and-forget so task creation never waits on the calendar.
  // The returned event id is persisted so we can later update/delete it.
  if (isConnected()) {
    createCalendarEvent({
      title: task.title,
      description: task.description,
      dueDate: body.dueDate ? new Date(body.dueDate) : null,
    })
      .then((eventId) => {
        if (eventId) {
          return setTaskGoogleEventId(task.id, eventId);
        }
        return undefined;
      })
      .catch((err) => console.error("[tasks] calendar sync failed:", err));
  }

  return NextResponse.json({ ...rest, project: Project });
}
