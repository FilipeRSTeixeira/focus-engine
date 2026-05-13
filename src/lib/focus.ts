import { prisma } from "./prisma";

export async function getTaskWithProject(taskId: number) {
  return await prisma.task.findUnique({
    where: { id: taskId },
    include: { Project: true },
  });
}

export async function setActiveTask(taskId: number) {
  // Wrap in a transaction so the deactivate-then-activate pair is atomic.
  // Without this, a concurrent reader (or Prisma's own optimistic snapshot
  // between two separate statements) can observe the intermediate state in
  // which the target task is briefly missing, surfacing as a confusing
  // "record not found" on the second statement.
  return await prisma.$transaction(async (tx) => {
    await tx.task.updateMany({
      where: { status: "active" },
      data: { status: "pending" },
    });

    return await tx.task.update({
      where: { id: taskId },
      data: { status: "active" },
    });
  });
}

export async function createFocusSession(data: {
  taskId: number;
  durationMinutes: number;
  type: "work" | "break";
  note?: string;
  focusLost: boolean;
}) {
  return await prisma.focusSession.create({
    data: {
      taskId: data.taskId,
      duration_minutes: data.durationMinutes,
      type: data.type,
      note: data.note,
      focus_lost: data.focusLost,
      completed: true,
    },
  });
}

export async function resetTaskStatus(taskId: number) {
  return await prisma.task.update({
    where: { id: taskId },
    data: { status: "pending" },
  });
}

export async function getActiveSession() {
  return await prisma.focusSession.findFirst({
    where: { completed: false },
    orderBy: { createdAt: "desc" },
  });
}

export async function hasActiveTask() {
  const count = await prisma.task.count({
    where: { status: "active" },
  });
  return count > 0;
}

export async function getTimerProfiles() {
  return await prisma.timerProfile.findMany({
    orderBy: { createdAt: "asc" },
  });
}

export async function getActiveTimerProfile() {
  return await prisma.timerProfile.findFirst({
    where: { isActive: true },
  });
}

export async function createTimerProfile(data: {
  name: string;
  workMinutes: number;
  breakMinutes: number;
  isActive?: boolean;
}) {
  if (data.isActive) {
    await prisma.timerProfile.updateMany({
      where: { isActive: true },
      data: { isActive: false },
    });
  }

  return await prisma.timerProfile.create({
    data: {
      name: data.name,
      workMinutes: data.workMinutes,
      breakMinutes: data.breakMinutes,
      isActive: data.isActive ?? false,
    },
  });
}

export async function updateTimerProfile(
  id: number,
  data: { name?: string; workMinutes?: number; breakMinutes?: number; isActive?: boolean }
) {
  if (data.isActive) {
    await prisma.timerProfile.updateMany({
      where: { isActive: true },
      data: { isActive: false },
    });
  }

  return await prisma.timerProfile.update({
    where: { id },
    data,
  });
}

export async function deleteTimerProfile(id: number) {
  const profile = await prisma.timerProfile.findUnique({
    where: { id },
  });

  if (!profile) {
    throw new Error("Profile not found");
  }

  if (profile.isDefault) {
    throw new Error("Cannot delete default profile");
  }

  if (profile.isActive) {
    const firstDefault = await prisma.timerProfile.findFirst({
      where: { isDefault: true },
    });
    if (firstDefault) {
      await prisma.timerProfile.update({
        where: { id: firstDefault.id },
        data: { isActive: true },
      });
    }
  }

  return await prisma.timerProfile.delete({
    where: { id },
  });
}

export async function activateTimerProfile(id: number) {
  await prisma.timerProfile.updateMany({
    where: { isActive: true },
    data: { isActive: false },
  });

  return await prisma.timerProfile.update({
    where: { id },
    data: { isActive: true },
  });
}
