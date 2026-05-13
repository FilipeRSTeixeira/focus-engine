import { google } from "googleapis";
import fs from "fs";
import path from "path";
import { getGoogleOAuthConfig } from "./settings";

const TOKEN_PATH = path.join(process.cwd(), "google-token.json");

/**
 * Returns an OAuth2 client configured with the credentials the user pasted
 * into the in-app settings. Returns null if credentials haven't been
 * configured yet — callers must handle this and direct the user to /settings.
 */
export async function getOAuthClient() {
  const config = await getGoogleOAuthConfig();
  if (!config) return null;
  return new google.auth.OAuth2(
    config.clientId,
    config.clientSecret,
    config.redirectUri
  );
}

export async function getAuthUrl(): Promise<string | null> {
  const oauth2Client = await getOAuthClient();
  if (!oauth2Client) return null;
  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: ["https://www.googleapis.com/auth/calendar.events"],
  });
}

export function saveToken(tokens: object) {
  fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens, null, 2));
}

export function loadToken(): object | null {
  try {
    if (fs.existsSync(TOKEN_PATH)) {
      return JSON.parse(fs.readFileSync(TOKEN_PATH, "utf-8"));
    }
  } catch {
    // ignore
  }
  return null;
}

export function clearToken(): void {
  try {
    if (fs.existsSync(TOKEN_PATH)) fs.unlinkSync(TOKEN_PATH);
  } catch {
    // ignore
  }
}

export function isConnected(): boolean {
  return loadToken() !== null;
}

export async function isConfigured(): Promise<boolean> {
  return (await getGoogleOAuthConfig()) !== null;
}

type CalendarApi = ReturnType<typeof google.calendar>;

/**
 * Returns a ready-to-use Google Calendar API client, or null if the user
 * hasn't configured credentials or hasn't completed the OAuth flow yet.
 */
async function getCalendarClient(): Promise<CalendarApi | null> {
  const tokens = loadToken();
  if (!tokens) return null;

  const oauth2Client = await getOAuthClient();
  if (!oauth2Client) return null;
  oauth2Client.setCredentials(tokens as Parameters<typeof oauth2Client.setCredentials>[0]);

  // Persist refreshed tokens so the next call doesn't have to re-auth.
  oauth2Client.on("tokens", (newTokens) => {
    const existing = loadToken() as Record<string, unknown> | null;
    saveToken({ ...(existing ?? {}), ...newTokens });
  });

  return google.calendar({ version: "v3", auth: oauth2Client });
}

/** Format a Date as YYYY-MM-DD for an all-day event start/end. */
function dateOnly(d: Date | null | undefined): string {
  return (d ?? new Date()).toISOString().split("T")[0];
}

/**
 * Creates an all-day event on the user's primary calendar.
 * Returns the Google event ID (string) on success, or null if anything failed
 * — calendar sync is best-effort and must never block task creation.
 */
export async function createCalendarEvent(task: {
  title: string;
  description?: string | null;
  dueDate?: Date | null;
}): Promise<string | null> {
  const calendar = await getCalendarClient();
  if (!calendar) return null;

  try {
    const res = await calendar.events.insert({
      calendarId: "primary",
      requestBody: {
        summary: task.title,
        description: task.description ?? undefined,
        start: { date: dateOnly(task.dueDate) },
        end: { date: dateOnly(task.dueDate) },
      },
    });
    return res.data.id ?? null;
  } catch (err) {
    console.error("[google-calendar] failed to create event:", err);
    return null;
  }
}

/**
 * Updates an existing all-day event. Used when a task's title/description/date
 * changes. Returns true on success, false otherwise.
 *
 * If the event has been deleted on the Google side (404), we treat that as a
 * "not synced anymore" signal so the caller can clear the stored event id.
 */
export async function updateCalendarEvent(
  eventId: string,
  task: {
    title: string;
    description?: string | null;
    dueDate?: Date | null;
  }
): Promise<{ ok: boolean; gone: boolean }> {
  const calendar = await getCalendarClient();
  if (!calendar) return { ok: false, gone: false };

  try {
    await calendar.events.update({
      calendarId: "primary",
      eventId,
      requestBody: {
        summary: task.title,
        description: task.description ?? undefined,
        start: { date: dateOnly(task.dueDate) },
        end: { date: dateOnly(task.dueDate) },
      },
    });
    return { ok: true, gone: false };
  } catch (err: unknown) {
    const status = (err as { code?: number; status?: number })?.code ?? (err as { status?: number })?.status;
    if (status === 404 || status === 410) {
      return { ok: false, gone: true };
    }
    console.error("[google-calendar] failed to update event:", err);
    return { ok: false, gone: false };
  }
}

/**
 * Deletes an event by ID. Returns true if the event no longer exists on the
 * Google side after the call (whether we deleted it or it was already gone).
 */
export async function deleteCalendarEvent(eventId: string): Promise<boolean> {
  const calendar = await getCalendarClient();
  if (!calendar) return false;

  try {
    await calendar.events.delete({
      calendarId: "primary",
      eventId,
    });
    return true;
  } catch (err: unknown) {
    const status = (err as { code?: number; status?: number })?.code ?? (err as { status?: number })?.status;
    if (status === 404 || status === 410) return true; // already gone — same outcome
    console.error("[google-calendar] failed to delete event:", err);
    return false;
  }
}
