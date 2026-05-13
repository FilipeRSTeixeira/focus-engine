import { NextResponse } from "next/server";
import { getOAuthClient, saveToken } from "@/lib/google-calendar";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.json({ error: "Missing code" }, { status: 400 });
  }

  try {
    const oauth2Client = await getOAuthClient();
    if (!oauth2Client) {
      const settingsUrl = new URL("/settings", request.url);
      settingsUrl.searchParams.set("error", "missing_credentials");
      return NextResponse.redirect(settingsUrl);
    }
    const { tokens } = await oauth2Client.getToken(code);
    saveToken(tokens);
    return NextResponse.redirect(`${origin}/?gcal=connected`);
  } catch (err) {
    console.error("[google-callback] token exchange failed:", err);
    return NextResponse.json({ error: "Token exchange failed" }, { status: 500 });
  }
}
