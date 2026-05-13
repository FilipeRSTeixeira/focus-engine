import { NextResponse } from "next/server";
import { isConnected, isConfigured } from "@/lib/google-calendar";

export async function GET() {
  const configured = await isConfigured();
  return NextResponse.json({
    configured,
    connected: configured && isConnected(),
  });
}
