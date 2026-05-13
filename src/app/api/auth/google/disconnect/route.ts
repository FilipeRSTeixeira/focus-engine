import { NextResponse } from "next/server";
import { clearToken } from "@/lib/google-calendar";

/**
 * Disconnects Google Calendar by wiping the saved OAuth token.
 * Credentials (Client ID/Secret) remain — the user can re-connect with one click.
 */
export async function POST() {
  clearToken();
  return NextResponse.json({ ok: true });
}
