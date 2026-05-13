"use client";

import { useState, useEffect, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Trash2,
  Plus,
  Star,
  Flame,
  Award,
  Pencil,
  X,
  Save,
  Calendar,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
} from "lucide-react";
import { CircleCheckbox } from "@/components/circle-checkbox";
import { PointsBadge } from "@/components/points-badge";
import { PRIORITY_COLORS } from "@/lib/colors";

/* -------------------------------------------------------------------------- */
/*                                   Types                                    */
/* -------------------------------------------------------------------------- */

const PRIORITIES = ["high", "medium", "low"] as const;
const ENERGIES = ["high", "medium", "low"] as const;
const STATUSES = ["pending", "active", "completed"] as const;

type Task = {
  id: number;
  title: string;
  description?: string | null;
  priority: string;
  expected_energy?: string | null;
  estimated_time_minutes?: number | null;
  status: string;
  projectId: number;
  is_hard?: boolean;
  points_earned?: number | null;
  completedAt?: string | null;
  createdAt: string;
  dueDate?: string | null;
  project: { name: string; color: string; icon?: string | null };
};

type Project = { id: number; name: string; color: string; icon?: string | null };

type EditForm = {
  projectId: string;
  title: string;
  description: string;
  priority: string;
  expected_energy: string;
  estimated_time_minutes: string;
  is_hard: boolean;
  dueDate: string;
};

type Breakdown = {
  base: number;
  daysPending: number;
  procrastinationBonus: number;
  streakBonus: number;
  morningBonus: number;
  hardBonus: number;
  total: number;
};

type UnlockedAchievement = {
  key: string;
  title: string;
  description: string;
  icon: string;
};

function toEditForm(task: Task): EditForm {
  return {
    projectId: String(task.projectId),
    title: task.title,
    description: task.description ?? "",
    priority: task.priority,
    expected_energy: task.expected_energy ?? "medium",
    estimated_time_minutes:
      task.estimated_time_minutes != null
        ? String(task.estimated_time_minutes)
        : "",
    is_hard: !!task.is_hard,
    dueDate: task.dueDate ? task.dueDate.slice(0, 10) : "",
  };
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("pt-PT", {
    day: "2-digit",
    month: "short",
  });
}

/* -------------------------------------------------------------------------- */
/*                                   Page                                     */
/* -------------------------------------------------------------------------- */

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [points, setPoints] = useState(0);

  // Quick-add state
  const [projectId, setProjectId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("medium");
  const [energy, setEnergy] = useState("medium");
  const [estimatedTime, setEstimatedTime] = useState("");
  const [isHard, setIsHard] = useState(false);
  const [dueDate, setDueDate] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [loading, setLoading] = useState(false);

  // Completion feedback
  const [pointsEarned, setPointsEarned] = useState<number | null>(null);
  const [completedTaskId, setCompletedTaskId] = useState<number | null>(null);
  const [lastBreakdown, setLastBreakdown] = useState<Breakdown | null>(null);
  const [newlyUnlocked, setNewlyUnlocked] = useState<UnlockedAchievement[]>([]);

  // Filters
  const [filterStatus, setFilterStatus] = useState("pending");
  const [filterPriority, setFilterPriority] = useState("");
  const [filterEnergy, setFilterEnergy] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Project filter — driven by ?projectId= in the URL (set by the sidebar).
  const searchParams = useSearchParams();
  const projectFilter = searchParams?.get("projectId") ?? "";

  // Inline editing
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<EditForm | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  /* ------------------------------ Data loading ----------------------------- */

  async function loadPoints() {
    try {
      const res = await fetch("/api/tasks/today-points");
      if (!res.ok) throw new Error(`points (${res.status})`);
      const data = await res.json();
      setPoints(data.points);
    } catch (e) {
      setError(
        e instanceof Error
          ? `Falha a carregar pontos: ${e.message}`
          : "Falha a carregar pontos"
      );
    }
  }

  async function loadTasks() {
    try {
      const params = new URLSearchParams();
      if (filterStatus) params.set("status", filterStatus);
      if (filterPriority) params.set("priority", filterPriority);
      if (filterEnergy) params.set("energy", filterEnergy);
      if (projectFilter) params.set("projectId", projectFilter);
      const res = await fetch(`/api/tasks?${params}`);
      if (!res.ok) throw new Error(`tasks (${res.status})`);
      const all = await res.json();
      setTasks(all);
      setError(null);
    } catch (e) {
      setError(
        e instanceof Error
          ? `Falha a carregar tarefas: ${e.message}`
          : "Falha a carregar tarefas"
      );
    }
  }

  async function loadProjects() {
    try {
      const res = await fetch("/api/projects");
      if (!res.ok) throw new Error(`projects (${res.status})`);
      const all = await res.json();
      setProjects(all);
      await loadTasks();
      await loadPoints();
    } catch (e) {
      setError(
        e instanceof Error
          ? `Falha a carregar projetos: ${e.message}`
          : "Falha a carregar projetos"
      );
    }
  }

  useEffect(() => {
    loadProjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-fetch when filters or project filter change.
  useEffect(() => {
    loadTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectFilter, filterStatus, filterPriority, filterEnergy]);

  /* ------------------------------ Mutations ------------------------------- */

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim() || !projectId) return;
    setLoading(true);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: Number(projectId),
          title: title.trim(),
          description: description.trim() || undefined,
          priority,
          expected_energy: energy,
          estimated_time_minutes: estimatedTime
            ? Number(estimatedTime)
            : undefined,
          is_hard: isHard,
          dueDate: dueDate || undefined,
        }),
      });
      if (!res.ok) throw new Error(`Falha a criar tarefa (${res.status})`);
      setTitle("");
      setDescription("");
      setEstimatedTime("");
      setPriority("medium");
      setEnergy("medium");
      setIsHard(false);
      setDueDate("");
      setShowAdvanced(false);
      await loadTasks();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha a criar tarefa");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: number, title: string) {
    if (!confirm(`Eliminar "${title}"?`)) return;
    try {
      const res = await fetch(`/api/tasks/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`Falha a eliminar (${res.status})`);
      await loadTasks();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha a eliminar tarefa");
    }
  }

  async function handleStatusChange(id: number, status: string) {
    try {
      const res = await fetch(`/api/tasks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error(`Falha a atualizar (${res.status})`);
      await loadTasks();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha a atualizar estado");
    }
  }

  function startEdit(task: Task) {
    setEditingId(task.id);
    setEditForm(toEditForm(task));
  }
  function cancelEdit() {
    setEditingId(null);
    setEditForm(null);
  }

  async function handleSaveEdit() {
    if (!editingId || !editForm) return;
    if (!editForm.title.trim() || !editForm.projectId) return;
    setSavingEdit(true);
    try {
      const res = await fetch(`/api/tasks/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: Number(editForm.projectId),
          title: editForm.title.trim(),
          description: editForm.description.trim() || null,
          priority: editForm.priority,
          expected_energy: editForm.expected_energy,
          estimated_time_minutes:
            editForm.estimated_time_minutes === ""
              ? null
              : Number(editForm.estimated_time_minutes),
          is_hard: editForm.is_hard,
          dueDate: editForm.dueDate || null,
        }),
      });
      if (!res.ok) throw new Error(`Falha a guardar (${res.status})`);
      cancelEdit();
      await loadTasks();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha a guardar tarefa");
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleComplete(id: number) {
    setCompletedTaskId(id);
    try {
      const res = await fetch(`/api/tasks/${id}/complete`, { method: "POST" });
      if (!res.ok) throw new Error(`Falha a concluir (${res.status})`);
      const result = await res.json();
      if (result) {
        setPointsEarned(result.pointsEarned);
        setLastBreakdown(result.breakdown ?? null);
        setNewlyUnlocked(result.newlyUnlocked ?? []);
        setTimeout(() => setPointsEarned(null), 4000);
        setTimeout(() => setLastBreakdown(null), 5000);
        setTimeout(() => setNewlyUnlocked([]), 6000);
        setTimeout(() => setCompletedTaskId(null), 600);
        await loadTasks();
        await loadPoints();
      }
    } catch (e) {
      setCompletedTaskId(null);
      setError(e instanceof Error ? e.message : "Falha a concluir tarefa");
    }
  }

  /* -------------------------------- Derived ------------------------------- */

  const activeProject = projectFilter
    ? projects.find((p) => String(p.id) === projectFilter)
    : null;
  const heading = activeProject ? activeProject.name : "Tarefas";

  return (
    <div className="mx-auto max-w-3xl px-6 pt-20 pb-16 sm:px-10 sm:pt-14">
      {/* ----------------------------- Header ----------------------------- */}
      <header className="mb-6 flex items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-3 text-[28px] font-semibold leading-tight tracking-tight sm:text-[32px]">
            {activeProject && (
              <span
                aria-hidden
                className="h-3.5 w-3.5 rounded-full"
                style={{ backgroundColor: activeProject.color }}
              />
            )}
            {heading}
          </h1>
          {activeProject && (
            <p className="mt-1 text-sm text-muted-foreground">
              <Link href="/tasks" className="hover:underline">
                ← Todas as tarefas
              </Link>
            </p>
          )}
        </div>
        <PointsBadge points={points} />
      </header>

      {/* ---------------------------- Quick-add --------------------------- */}
      <form
        onSubmit={handleSubmit}
        className="mb-6 rounded-2xl bg-card p-4 shadow-card"
      >
        <div className="flex flex-wrap items-center gap-2">
          <span
            aria-hidden
            className="ml-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-[1.5px] border-border"
          >
            <Plus size={12} className="text-muted-foreground" />
          </span>
          <input
            type="text"
            placeholder="Nova tarefa…"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="flex-1 min-w-0 bg-transparent px-1 py-2 text-[15px] text-foreground placeholder:text-muted-foreground focus:outline-none"
            required
          />
          <select
            value={projectId || (activeProject ? String(activeProject.id) : "")}
            onChange={(e) => setProjectId(e.target.value)}
            className="rounded-md bg-muted px-2.5 py-2 text-xs text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-ring/40"
            required
            title="Projeto"
          >
            <option value="">Projeto…</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setShowAdvanced((v) => !v)}
            className="inline-flex items-center gap-1 rounded-md px-2 py-2 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-expanded={showAdvanced}
          >
            {showAdvanced ? (
              <ChevronUp size={14} />
            ) : (
              <ChevronDown size={14} />
            )}
            Opções
          </button>
          <button
            type="submit"
            disabled={loading || !title.trim() || !(projectId || activeProject)}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            <Plus size={13} />
            Adicionar
          </button>
        </div>

        {showAdvanced && (
          <div className="mt-3 grid grid-cols-1 gap-2 border-t border-border pt-3 sm:grid-cols-2">
            <textarea
              placeholder="Descrição (opcional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="col-span-full rounded-md bg-muted/60 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"
            />
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="rounded-md bg-muted/60 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"
              title="Prioridade"
            >
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  Prioridade {p === "high" ? "alta" : p === "medium" ? "média" : "baixa"}
                </option>
              ))}
            </select>
            <select
              value={energy}
              onChange={(e) => setEnergy(e.target.value)}
              className="rounded-md bg-muted/60 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"
              title="Energia esperada"
            >
              {ENERGIES.map((en) => (
                <option key={en} value={en}>
                  Energia {en === "high" ? "alta" : en === "medium" ? "média" : "baixa"}
                </option>
              ))}
            </select>
            <input
              type="number"
              placeholder="Minutos estimados"
              value={estimatedTime}
              onChange={(e) => setEstimatedTime(e.target.value)}
              min={1}
              className="rounded-md bg-muted/60 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"
            />
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              title="Data limite"
              className="rounded-md bg-muted/60 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"
            />
            <label className="col-span-full inline-flex cursor-pointer items-center gap-2 rounded-md bg-muted/60 px-3 py-2 text-sm text-foreground">
              <input
                type="checkbox"
                checked={isHard}
                onChange={(e) => setIsHard(e.target.checked)}
                className="h-4 w-4 accent-[#AF52DE]"
              />
              <Flame
                size={14}
                style={{
                  color: isHard ? "#AF52DE" : "var(--muted-foreground)",
                }}
              />
              <span>
                Tarefa difícil <span className="text-muted-foreground">(+30%, máx 2/dia)</span>
              </span>
            </label>
          </div>
        )}
      </form>

      {/* --------------------------- Filters row -------------------------- */}
      <div className="mb-4 flex flex-wrap items-center gap-2 px-1">
        <button
          type="button"
          onClick={() => setShowFilters((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-expanded={showFilters}
        >
          <SlidersHorizontal size={12} />
          Filtros
        </button>
        {showFilters && (
          <>
            <FilterSelect
              value={filterStatus}
              onChange={setFilterStatus}
              placeholder="Todos os estados"
              options={STATUSES.map((s) => ({
                value: s,
                label:
                  s === "pending"
                    ? "Pendentes"
                    : s === "active"
                    ? "Ativas"
                    : "Concluídas",
              }))}
            />
            <FilterSelect
              value={filterPriority}
              onChange={setFilterPriority}
              placeholder="Todas as prioridades"
              options={PRIORITIES.map((p) => ({
                value: p,
                label: `Prioridade ${
                  p === "high" ? "alta" : p === "medium" ? "média" : "baixa"
                }`,
              }))}
            />
            <FilterSelect
              value={filterEnergy}
              onChange={setFilterEnergy}
              placeholder="Toda a energia"
              options={ENERGIES.map((e) => ({
                value: e,
                label: `Energia ${
                  e === "high" ? "alta" : e === "medium" ? "média" : "baixa"
                }`,
              }))}
            />
            {(filterStatus || filterPriority || filterEnergy) && (
              <button
                type="button"
                onClick={() => {
                  setFilterStatus("");
                  setFilterPriority("");
                  setFilterEnergy("");
                }}
                className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
              >
                Limpar <X size={11} />
              </button>
            )}
          </>
        )}
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* --------------------------- Task list --------------------------- */}
      {tasks.length === 0 ? (
        <div className="rounded-2xl bg-card px-5 py-10 text-center shadow-card">
          <p className="text-sm font-medium text-foreground">
            Sem tarefas a mostrar.
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Cria uma nova tarefa acima — prioridades altas valem mais pontos
            quanto mais tempo aguardarem.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col" role="list">
          {tasks.map((task) => {
            const isEditing = editingId === task.id && editForm;
            const isCompleted = task.status === "completed";
            const isCompletingNow = completedTaskId === task.id;
            return (
              <li
                key={task.id}
                className={`group/task relative flex flex-col rounded-lg px-2 transition-colors ${
                  isEditing
                    ? "bg-muted/40"
                    : isCompletingNow
                    ? "bg-success/10"
                    : "hover:bg-muted/40"
                } ${isCompleted ? "opacity-60" : ""}`}
              >
                <div className="flex items-start gap-3 py-2.5">
                  <div className="pt-0.5">
                    <CircleCheckbox
                      checked={isCompleted || isCompletingNow}
                      onChange={() => {
                        if (isCompleted || isCompletingNow) return;
                        handleComplete(task.id);
                      }}
                      size={20}
                      fillColor={task.project.color}
                      label={`Concluir ${task.title}`}
                      disabled={isCompleted || isCompletingNow}
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    {/* Title row */}
                    <div className="flex flex-wrap items-center gap-2">
                      {task.priority !== "low" && (
                        <span
                          aria-hidden
                          className="h-1.5 w-1.5 shrink-0 rounded-full"
                          style={{
                            backgroundColor: PRIORITY_COLORS[task.priority],
                          }}
                          title={`Prioridade ${task.priority}`}
                        />
                      )}
                      <span
                        className={`text-[15px] text-foreground ${
                          isCompleted
                            ? "line-through decoration-muted-foreground/40"
                            : ""
                        }`}
                      >
                        {task.title}
                      </span>
                      {task.is_hard && (
                        <span
                          title="Tarefa difícil (+30% bónus)"
                          aria-label="Tarefa difícil"
                          className="inline-flex"
                        >
                          <Flame size={11} style={{ color: "#AF52DE" }} />
                        </span>
                      )}
                      {task.points_earned != null && (
                        <span
                          className="inline-flex items-center gap-0.5 text-xs font-medium"
                          style={{ color: "#FFC107" }}
                          title="Pontos ganhos"
                        >
                          <Star size={11} className="fill-current" />
                          {task.points_earned}
                        </span>
                      )}
                    </div>

                    {task.description && !isEditing && (
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {task.description}
                      </p>
                    )}

                    {/* Meta row */}
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
                      {task.expected_energy && (
                        <span>energia {task.expected_energy}</span>
                      )}
                      {task.estimated_time_minutes && (
                        <span>{task.estimated_time_minutes} min</span>
                      )}
                      {task.dueDate && (
                        <span
                          className="inline-flex items-center gap-1"
                          title="Data limite"
                        >
                          <Calendar size={10} />
                          {formatDate(task.dueDate)}
                        </span>
                      )}
                      {task.status !== "pending" && task.status !== "completed" && (
                        <span className="inline-flex items-center gap-1">
                          <span className="h-1.5 w-1.5 rounded-full bg-[#3478F6]" />
                          {task.status === "active" ? "ativa" : task.status}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Project + actions */}
                  <div className="flex shrink-0 items-center gap-1">
                    <Link
                      href={`/tasks?projectId=${task.projectId}`}
                      className="inline-flex max-w-[120px] items-center gap-1.5 truncate rounded-md px-1.5 py-1 text-[11px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      title={task.project.name}
                    >
                      <span
                        aria-hidden
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ backgroundColor: task.project.color }}
                      />
                      <span className="hidden truncate sm:inline">
                        {task.project.name}
                      </span>
                    </Link>

                    {/* Hover-revealed actions */}
                    <div className="flex items-center opacity-0 transition-opacity focus-within:opacity-100 group-hover/task:opacity-100">
                      <button
                        onClick={() =>
                          isEditing ? cancelEdit() : startEdit(task)
                        }
                        aria-label={
                          isEditing
                            ? "Cancelar edição"
                            : `Editar ${task.title}`
                        }
                        title={isEditing ? "Cancelar" : "Editar"}
                        className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      >
                        {isEditing ? <X size={13} /> : <Pencil size={13} />}
                      </button>
                      <button
                        onClick={() => handleDelete(task.id, task.title)}
                        aria-label={`Eliminar ${task.title}`}
                        title="Eliminar"
                        className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 size={13} />
                      </button>
                      {!isCompleted && (
                        <select
                          value={task.status}
                          onChange={(e) =>
                            handleStatusChange(task.id, e.target.value)
                          }
                          aria-label="Mudar estado"
                          className="ml-0.5 rounded-md bg-transparent px-1.5 py-1 text-[11px] text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring/40 hover:bg-muted"
                        >
                          {STATUSES.map((s) => (
                            <option key={s} value={s}>
                              {s === "pending"
                                ? "pendente"
                                : s === "active"
                                ? "ativa"
                                : "concluída"}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  </div>
                </div>

                {/* Inline edit drawer */}
                {isEditing && editForm && (
                  <div className="mb-2 ml-9 mr-1 rounded-lg bg-background p-3 shadow-card">
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <select
                        value={editForm.projectId}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            projectId: e.target.value,
                          })
                        }
                        className="rounded-md bg-muted/60 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"
                        required
                      >
                        <option value="">Projeto…</option>
                        {projects.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                      <input
                        type="text"
                        placeholder="Título *"
                        value={editForm.title}
                        onChange={(e) =>
                          setEditForm({ ...editForm, title: e.target.value })
                        }
                        className="rounded-md bg-muted/60 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"
                        required
                      />
                    </div>

                    <textarea
                      placeholder="Descrição (opcional)"
                      value={editForm.description}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          description: e.target.value,
                        })
                      }
                      rows={2}
                      className="mt-2 w-full rounded-md bg-muted/60 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"
                    />

                    <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                      <select
                        value={editForm.priority}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            priority: e.target.value,
                          })
                        }
                        className="rounded-md bg-muted/60 px-2 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"
                      >
                        {PRIORITIES.map((p) => (
                          <option key={p} value={p}>
                            {p === "high" ? "alta" : p === "medium" ? "média" : "baixa"}
                          </option>
                        ))}
                      </select>
                      <select
                        value={editForm.expected_energy}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            expected_energy: e.target.value,
                          })
                        }
                        className="rounded-md bg-muted/60 px-2 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"
                      >
                        {ENERGIES.map((en) => (
                          <option key={en} value={en}>
                            {en === "high" ? "alta" : en === "medium" ? "média" : "baixa"}
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        placeholder="min."
                        value={editForm.estimated_time_minutes}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            estimated_time_minutes: e.target.value,
                          })
                        }
                        min={1}
                        className="rounded-md bg-muted/60 px-2 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"
                      />
                      <input
                        type="date"
                        value={editForm.dueDate}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            dueDate: e.target.value,
                          })
                        }
                        title="Data limite"
                        className="rounded-md bg-muted/60 px-2 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"
                      />
                    </div>

                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                      <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-foreground">
                        <input
                          type="checkbox"
                          checked={editForm.is_hard}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              is_hard: e.target.checked,
                            })
                          }
                          className="h-3.5 w-3.5 accent-[#AF52DE]"
                        />
                        <Flame
                          size={12}
                          style={{
                            color: editForm.is_hard
                              ? "#AF52DE"
                              : "var(--muted-foreground)",
                          }}
                        />
                        <span>Tarefa difícil</span>
                      </label>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={cancelEdit}
                          className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
                        >
                          <X size={12} /> Cancelar
                        </button>
                        <button
                          type="button"
                          onClick={handleSaveEdit}
                          disabled={savingEdit}
                          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
                        >
                          <Save size={12} /> Guardar
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {/* --------------------------- Toasts ------------------------------- */}
      {pointsEarned !== null && (
        <div
          aria-live="polite"
          className="pointer-events-none fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background shadow-popover"
        >
          <span className="inline-flex items-center gap-1.5">
            <Star
              size={14}
              className="fill-current"
              style={{ color: "#FFC107" }}
            />
            +{pointsEarned} pts
          </span>
        </div>
      )}

      {lastBreakdown && (
        <div className="fixed bottom-20 left-1/2 z-40 max-w-md -translate-x-1/2 rounded-xl bg-card px-4 py-3 text-xs shadow-popover">
          <div
            className="mb-1 font-medium"
            style={{ color: "#FFC107" }}
          >
            +{lastBreakdown.total} pts — detalhe
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-muted-foreground">
            <span>base {lastBreakdown.base}</span>
            {lastBreakdown.daysPending > 0 && (
              <span>+{lastBreakdown.daysPending} dias</span>
            )}
            {lastBreakdown.procrastinationBonus > 0 && (
              <span style={{ color: "#FF9500" }}>
                +{lastBreakdown.procrastinationBonus} procrastinação
              </span>
            )}
            {lastBreakdown.streakBonus > 0 && (
              <span style={{ color: "#FF3B30" }}>
                +{lastBreakdown.streakBonus} streak
              </span>
            )}
            {lastBreakdown.morningBonus > 0 && (
              <span style={{ color: "#3478F6" }}>
                +{lastBreakdown.morningBonus} manhã
              </span>
            )}
            {lastBreakdown.hardBonus > 0 && (
              <span style={{ color: "#AF52DE" }}>
                +{lastBreakdown.hardBonus} difícil
              </span>
            )}
          </div>
        </div>
      )}

      {newlyUnlocked.length > 0 && (
        <div className="fixed bottom-36 left-1/2 z-40 max-w-md -translate-x-1/2 rounded-xl bg-card px-4 py-3 shadow-popover">
          <div
            className="mb-1 inline-flex items-center gap-1.5 text-xs font-medium"
            style={{ color: "#FFC107" }}
          >
            <Award size={13} /> Conquista desbloqueada
          </div>
          {newlyUnlocked.map((a) => (
            <div key={a.key} className="text-sm">
              <span className="font-medium text-foreground">{a.title}</span>
              <span className="ml-2 text-muted-foreground">
                {a.description}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                              Subcomponents                                 */
/* -------------------------------------------------------------------------- */

function FilterSelect({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-md bg-muted px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring/40"
    >
      <option value="">{placeholder}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
