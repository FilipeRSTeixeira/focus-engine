import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { prisma } from "./prisma";
import { getPriorityTasks } from "./tasks";

describe("getPriorityTasks", () => {
  let projectId: number;

  beforeEach(async () => {
    const project = await prisma.project.create({
      data: { name: "Test Project", color: "#6366f1", icon: "folder" },
    });
    projectId = project.id;
  });

  afterAll(async () => {
    await prisma.task.deleteMany();
    await prisma.project.deleteMany();
    await prisma.$disconnect();
  });

  it("excludes active tasks and returns only pending", async () => {
    await prisma.task.create({
      data: {
        projectId,
        title: "Active task",
        priority: "high",
        status: "active",
      },
    });
    await prisma.task.create({
      data: {
        projectId,
        title: "Pending task",
        priority: "low",
        status: "pending",
      },
    });

    const result = await getPriorityTasks(projectId);
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("Pending task");
  });

  it("orders by priority desc (high > medium > low)", async () => {
    await prisma.task.create({
      data: { projectId, title: "Low", priority: "low", status: "pending" },
    });
    await prisma.task.create({
      data: { projectId, title: "High", priority: "high", status: "pending" },
    });
    await prisma.task.create({
      data: { projectId, title: "Medium", priority: "medium", status: "pending" },
    });

    const result = await getPriorityTasks(projectId, 10);
    expect(result.map((t) => t.title)).toEqual(["High", "Medium", "Low"]);
  });

  it("orders by age asc within same priority", async () => {
    const old = new Date(Date.now() - 86400000 * 3);
    const newer = new Date(Date.now() - 86400000);

    await prisma.task.create({
      data: { projectId, title: "Newer", priority: "high", status: "pending", createdAt: newer },
    });
    await prisma.task.create({
      data: { projectId, title: "Older", priority: "high", status: "pending", createdAt: old },
    });
    await prisma.task.create({
      data: { projectId, title: "Middle", priority: "medium", status: "pending" },
    });

    const result = await getPriorityTasks(projectId, 10);
    expect(result.map((t) => t.title)).toEqual(["Older", "Newer", "Middle"]);
  });

  it("respects limit parameter (default 3)", async () => {
    const ownProject = await prisma.project.create({
      data: { name: "Limit Test", color: "#6366f1", icon: "folder" },
    });
    for (let i = 0; i < 5; i++) {
      await prisma.task.create({
        data: {
          projectId: ownProject.id,
          title: `Task ${i}`,
          priority: "medium",
          status: "pending",
        },
      });
    }

    const all = await getPriorityTasks(ownProject.id, 10);
    expect(all).toHaveLength(5);

    const limited = await getPriorityTasks(ownProject.id, 2);
    expect(limited).toHaveLength(2);
  });

  it("filters by projectId", async () => {
    const otherProject = await prisma.project.create({
      data: { name: "Other", color: "#22c55e", icon: "folder" },
    });

    await prisma.task.create({
      data: { projectId, title: "This project", priority: "high", status: "pending" },
    });
    await prisma.task.create({
      data: { projectId: otherProject.id, title: "Other project", priority: "high", status: "pending" },
    });

    const result = await getPriorityTasks(projectId);
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("This project");

    await prisma.task.deleteMany({ where: { projectId: otherProject.id } });
    await prisma.project.delete({ where: { id: otherProject.id } });
  });

  it("returns empty array when no pending tasks exist", async () => {
    const result = await getPriorityTasks(projectId);
    expect(result).toHaveLength(0);
  });
});
