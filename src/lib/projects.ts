import { prisma } from "./prisma";

export async function getProjects() {
  return await prisma.project.findMany({
    orderBy: { createdAt: "desc" },
  });
}

export async function createProject(data: {
  name: string;
  color?: string;
  icon?: string;
}) {
  return await prisma.project.create({
    data: {
      name: data.name,
      color: data.color ?? "#6366f1",
      icon: data.icon ?? "folder",
    },
  });
}

export async function updateProject(
  id: number,
  data: { name?: string; color?: string; icon?: string }
) {
  const updateData: Record<string, unknown> = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.color !== undefined) updateData.color = data.color;
  if (data.icon !== undefined) updateData.icon = data.icon;
  return await prisma.project.update({
    where: { id },
    data: updateData,
  });
}

export async function deleteProject(id: number) {
  await prisma.task.deleteMany({ where: { projectId: id } });
  return await prisma.project.delete({ where: { id } });
}
