import { NextResponse } from "next/server";
import {
  SETTING_KEYS,
  getSetting,
  setSetting,
  deleteSetting,
} from "@/lib/settings";
import { clearToken, isConnected } from "@/lib/google-calendar";

/** Mask a client id so we can show "configured" state without exposing the full value. */
function maskClientId(clientId: string): string {
  if (clientId.length <= 12) return "•".repeat(clientId.length);
  return `${clientId.slice(0, 6)}…${clientId.slice(-4)}`;
}

/** GET — returns whether credentials are set + masked client id + connection state. */
export async function GET() {
  const [clientId, clientSecret, redirectUri] = await Promise.all([
    getSetting(SETTING_KEYS.GOOGLE_CLIENT_ID),
    getSetting(SETTING_KEYS.GOOGLE_CLIENT_SECRET),
    getSetting(SETTING_KEYS.GOOGLE_REDIRECT_URI),
  ]);
  return NextResponse.json({
    configured: Boolean(clientId && clientSecret),
    clientIdMasked: clientId ? maskClientId(clientId) : null,
    hasSecret: Boolean(clientSecret),
    redirectUri: redirectUri || "http://localhost:3210/api/auth/google/callback",
    connected: Boolean(clientId && clientSecret) && isConnected(),
  });
}

/** POST — saves new credentials. Disconnects (deletes token) if creds change. */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  const { clientId, clientSecret, redirectUri } = body as {
    clientId?: unknown;
    clientSecret?: unknown;
    redirectUri?: unknown;
  };

  if (typeof clientId !== "string" || !clientId.trim()) {
    return NextResponse.json({ error: "Client ID em falta" }, { status: 400 });
  }
  if (typeof clientSecret !== "string" || !clientSecret.trim()) {
    return NextResponse.json({ error: "Client Secret em falta" }, { status: 400 });
  }
  if (redirectUri !== undefined && typeof redirectUri !== "string") {
    return NextResponse.json({ error: "Redirect URI inválido" }, { status: 400 });
  }

  // If credentials change, the old token is no longer valid — clear it.
  const existingClientId = await getSetting(SETTING_KEYS.GOOGLE_CLIENT_ID);
  if (existingClientId && existingClientId !== clientId.trim()) {
    clearToken();
  }

  await setSetting(SETTING_KEYS.GOOGLE_CLIENT_ID, clientId.trim());
  await setSetting(SETTING_KEYS.GOOGLE_CLIENT_SECRET, clientSecret.trim());
  if (redirectUri && redirectUri.trim()) {
    await setSetting(SETTING_KEYS.GOOGLE_REDIRECT_URI, redirectUri.trim());
  }

  return NextResponse.json({ ok: true });
}

/** DELETE — wipes credentials and any active token. */
export async function DELETE() {
  await Promise.all([
    deleteSetting(SETTING_KEYS.GOOGLE_CLIENT_ID),
    deleteSetting(SETTING_KEYS.GOOGLE_CLIENT_SECRET),
    deleteSetting(SETTING_KEYS.GOOGLE_REDIRECT_URI),
  ]);
  clearToken();
  return NextResponse.json({ ok: true });
}
