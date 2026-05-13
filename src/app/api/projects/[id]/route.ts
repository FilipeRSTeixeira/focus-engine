import { NextResponse } from "next/server";
import { deleteProject, updateProject } from "@/lib/projects";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const numId = Number(id);
  if (!Number.isInteger(numId) || numId < 1) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }
  await deleteProject(numId);
  return NextResponse.json({ ok: true });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const numId = Number(id);
  if (!Number.isInteger(numId) || numId < 1) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }
  const body = await request.json();
  const updated = await updateProject(numId, {
    name: typeof body.name === "string" ? body.name : undefined,
    color: typeof body.color === "string" ? body.color : undefined,
    icon: typeof body.icon === "string" ? body.icon : undefined,
  });
  return NextResponse.json(updated);
}
