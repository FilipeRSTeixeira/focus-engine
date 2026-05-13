import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { deleteTask, setTaskGoogleEventId, updateTask } from "@/lib/tasks";
import {
  createCalendarEvent,
  deleteCalendarEvent,
  isConnected,
  updateCalendarEvent,
} from "@/lib/google-calendar";

/** Fields whose change should be reflected on the Google Calendar event. */
function shouldSyncToCalendar(body: {
  title?: unknown;
  description?: unknown;
  dueDate?: unknown;
}): boolean {
  return (
    body.title !== undefined ||
    body.description !== undefined ||
    body.dueDate !== undefined
  );
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const taskId = Number(id);

  // Capture the Google event id BEFORE deleting the row so we can clean up
  // the corresponding calendar event afterwards.
  const existing = await prisma.task.findUnique({
    where: { id: taskId },
    select: { google_event_id: true },
  });

  await deleteTask(taskId);

  if (existing?.google_event_id && isConnected()) {
    // Fire-and-forget: don't make the user wait on Google for the delete to
    // return. If it fails, we just log — the worst case is an orphan event.
    deleteCalendarEvent(existing.google_event_id).catch((err) =>
      console.error("[tasks] calendar delete failed:", err)
    );
  }

  return NextResponse.json({ ok: true });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const taskId = Number(id);
  const body = await request.json();

  const updated = await updateTask(taskId, {
    projectId: body.projectId !== undefined ? Number(body.projectId) : undefined,
    title: body.title,
    description: body.description,
    priority: body.priority,
    expected_energy: body.expected_energy,
    estimated_time_minutes:
      body.estimated_time_minutes === undefined
        ? undefined
        : body.estimated_time_minutes === null || body.estimated_time_minutes === ""
          ? null
          : Number(body.estimated_time_minutes),
    is_hard: body.is_hard,
    dueDate: body.dueDate,
    status: body.status,
  });

  // Sync visible changes (title/description/date) to the Google Calendar
  // event, if there's one linked. Fire-and-forget so PATCH stays fast.
  if (isConnected() && shouldSyncToCalendar(body)) {
    const eventPayload = {
      title: updated.title,
      description: updated.description,
      dueDate: updated.dueDate ?? null,
    };

    if (updated.google_event_id) {
      const stableEventId = updated.google_event_id;
      updateCalendarEvent(stableEventId, eventPayload)
        .then((result) => {
          if (result.gone) {
            // Event was deleted on Google's side — try to recreate it so the
            // user's calendar reflects the task again, and update the stored id.
            return createCalendarEvent(eventPayload).then((newId) =>
              setTaskGoogleEventId(taskId, newId ?? null)
            );
          }
          return undefined;
        })
        .catch((err) =>
          console.error("[tasks] calendar update failed:", err)
        );
    } else {
      // Task was never linked to a calendar event (perhaps created while
      // disconnected). Create one now and persist the id.
      createCalendarEvent(eventPayload)
        .then((eventId) => {
          if (eventId) return setTaskGoogleEventId(taskId, eventId);
          return undefined;
        })
        .catch((err) =>
          console.error("[tasks] calendar backfill failed:", err)
        );
    }
  }

  const { Project, ...rest } = updated;
  return NextResponse.json({ ...rest, project: Project });
}
