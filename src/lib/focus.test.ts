import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { prisma } from "./prisma";
import { getActiveSession, hasActiveTask, setActiveTask, createFocusSession, resetTaskStatus } from "./focus";

describe("concurrency enforcement", () => {
  beforeEach(async () => {
    await prisma.focusSession.deleteMany();
    await prisma.task.updateMany({ data: { status: "pending" } });
    await prisma.task.deleteMany();
    await prisma.project.deleteMany();
  });

  afterAll(async () => {
    await prisma.focusSession.deleteMany();
    await prisma.task.deleteMany();
    await prisma.project.deleteMany();
    await prisma.$disconnect();
  });

  it("returns null when no active session exists", async () => {
    const project = await prisma.project.create({
      data: { name: "Test", color: "#6366f1", icon: "folder" },
    });
    await prisma.task.create({
      data: { projectId: project.id, title: "Task", priority: "high", status: "pending" },
    });
    expect(await getActiveSession()).toBeNull();
  });

  it("returns active session when one exists", async () => {
    const project = await prisma.project.create({
      data: { name: "Test", color: "#6366f1", icon: "folder" },
    });
    const task = await prisma.task.create({
      data: { projectId: project.id, title: "Task", priority: "high", status: "pending" },
    });

    await prisma.focusSession.create({
      data: { taskId: task.id, duration_minutes: 25, type: "work", completed: false },
    });

    const session = await getActiveSession();
    expect(session).not.toBeNull();
    expect(session?.completed).toBe(false);
  });

  it("excludes completed sessions", async () => {
    const project = await prisma.project.create({
      data: { name: "Test", color: "#6366f1", icon: "folder" },
    });
    const task = await prisma.task.create({
      data: { projectId: project.id, title: "Task", priority: "high", status: "pending" },
    });

    await prisma.focusSession.create({
      data: { taskId: task.id, duration_minutes: 25, type: "work", completed: true },
    });

    expect(await getActiveSession()).toBeNull();
  });

  it("hasActiveTask returns true when a task is active", async () => {
    const project = await prisma.project.create({
      data: { name: "Test", color: "#6366f1", icon: "folder" },
    });
    const task = await prisma.task.create({
      data: { projectId: project.id, title: "Task", priority: "high", status: "pending" },
    });

    await setActiveTask(task.id);
    expect(await hasActiveTask()).toBe(true);
  });

  it("hasActiveTask returns false when no task is active", async () => {
    const project = await prisma.project.create({
      data: { name: "Test", color: "#6366f1", icon: "folder" },
    });
    await prisma.task.create({
      data: { projectId: project.id, title: "Task", priority: "high", status: "pending" },
    });

    expect(await hasActiveTask()).toBe(false);
  });

  it("setActiveTask deactivates previous active task", async () => {
    const project = await prisma.project.create({
      data: { name: "Test", color: "#6366f1", icon: "folder" },
    });
    const task1 = await prisma.task.create({
      data: { projectId: project.id, title: "Task 1", priority: "high", status: "pending" },
    });
    const task2 = await prisma.task.create({
      data: { projectId: project.id, title: "Task 2", priority: "medium", status: "pending" },
    });

    await setActiveTask(task1.id);
    let t1 = await prisma.task.findUnique({ where: { id: task1.id } });
    let t2 = await prisma.task.findUnique({ where: { id: task2.id } });
    expect(t1?.status).toBe("active");
    expect(t2?.status).toBe("pending");

    await setActiveTask(task2.id);
    t1 = await prisma.task.findUnique({ where: { id: task1.id } });
    t2 = await prisma.task.findUnique({ where: { id: task2.id } });
    expect(t1?.status).toBe("pending");
    expect(t2?.status).toBe("active");
  });

  it("completing a session resets task status to pending", async () => {
    const project = await prisma.project.create({
      data: { name: "Test", color: "#6366f1", icon: "folder" },
    });
    const task = await prisma.task.create({
      data: { projectId: project.id, title: "Task", priority: "high", status: "pending" },
    });

    await setActiveTask(task.id);
    expect((await prisma.task.findUnique({ where: { id: task.id } }))?.status).toBe("active");

    await resetTaskStatus(task.id);
    expect((await prisma.task.findUnique({ where: { id: task.id } }))?.status).toBe("pending");
  });
});
