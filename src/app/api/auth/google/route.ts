import { NextResponse } from "next/server";
import { getAuthUrl } from "@/lib/google-calendar";

export async function GET(request: Request) {
  const url = await getAuthUrl();
  if (!url) {
    // No credentials configured yet — send the user to settings.
    const settingsUrl = new URL("/settings", request.url);
    settingsUrl.searchParams.set("error", "missing_credentials");
    return NextResponse.redirect(settingsUrl);
  }
  return NextResponse.redirect(url);
}
