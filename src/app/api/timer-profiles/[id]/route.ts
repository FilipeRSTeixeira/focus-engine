import { NextResponse } from "next/server";
import { updateTimerProfile, deleteTimerProfile, activateTimerProfile } from "@/lib/focus";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const body = await request.json();
    const id = Number((await params).id);

    const { name, workMinutes, breakMinutes, isActive } = body;

    if (!name && workMinutes === undefined && breakMinutes === undefined) {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
    }

    if (workMinutes !== undefined && (workMinutes < 1 || !Number.isInteger(workMinutes))) {
      return NextResponse.json({ error: "Invalid work minutes" }, { status: 400 });
    }

    if (breakMinutes !== undefined && (breakMinutes < 1 || !Number.isInteger(breakMinutes))) {
      return NextResponse.json({ error: "Invalid break minutes" }, { status: 400 });
    }

    const profile = await updateTimerProfile(id, {
      name,
      workMinutes,
      breakMinutes,
      isActive,
    });

    return NextResponse.json({ profile });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to update profile";
    if (message === "Profile not found") {
      return NextResponse.json({ error: message }, { status: 404 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const id = Number((await params).id);
    await deleteTimerProfile(id);
    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to delete profile";
    if (message === "Cannot delete default profile") {
      return NextResponse.json({ error: message }, { status: 403 });
    }
    if (message === "Profile not found") {
      return NextResponse.json({ error: message }, { status: 404 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const id = Number((await params).id);
    const profile = await activateTimerProfile(id);
    return NextResponse.json({ profile });
  } catch {
    return NextResponse.json({ error: "Failed to activate profile" }, { status: 500 });
  }
}
