import { NextResponse } from "next/server";
import { getProjects, createProject } from "@/lib/projects";

export async function GET() {
  const projects = await getProjects();
  return NextResponse.json(projects);
}

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
  const { name, color, icon } = body as { name?: unknown; color?: unknown; icon?: unknown };
  if (typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "Missing or invalid name" }, { status: 400 });
  }
  if (color !== undefined && typeof color !== "string") {
    return NextResponse.json({ error: "Invalid color" }, { status: 400 });
  }
  if (icon !== undefined && typeof icon !== "string") {
    return NextResponse.json({ error: "Invalid icon" }, { status: 400 });
  }
  const project = await createProject({
    name: name.trim(),
    color: color as string | undefined,
    icon: icon as string | undefined,
  });
  return NextResponse.json(project);
}
