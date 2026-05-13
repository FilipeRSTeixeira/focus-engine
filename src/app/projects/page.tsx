"use client";

import { useState, useEffect, type FormEvent } from "react";
import Link from "next/link";
import {
  Trash2,
  Plus,
  Folder,
  Briefcase,
  Code,
  Heart,
  Star,
  Zap,
  Globe,
  Book,
  Camera,
  Music,
  Palette,
  Rocket,
  Pencil,
  X,
  Save,
  ChevronDown,
  ChevronUp,
  Check,
} from "lucide-react";

/* -------------------------------------------------------------------------- */
/*                                Constants                                   */
/* -------------------------------------------------------------------------- */

const ICON_OPTIONS = [
  { name: "folder", Icon: Folder },
  { name: "briefcase", Icon: Briefcase },
  { name: "code", Icon: Code },
  { name: "heart", Icon: Heart },
  { name: "star", Icon: Star },
  { name: "zap", Icon: Zap },
  { name: "globe", Icon: Globe },
  { name: "book", Icon: Book },
  { name: "camera", Icon: Camera },
  { name: "music", Icon: Music },
  { name: "palette", Icon: Palette },
  { name: "rocket", Icon: Rocket },
] as const;

/** Refreshed palette aligned with Things-style accents (iOS / Apple). */
const COLOR_OPTIONS = [
  "#3478F6", // blue
  "#34C759", // green
  "#FFC107", // amber
  "#FF9500", // orange
  "#FF3B30", // red
  "#AF52DE", // purple
  "#5856D6", // indigo
  "#FF2D55", // pink
  "#00C7BE", // teal
  "#8E8E93", // gray
];

function getIconComponent(iconName: string) {
  return ICON_OPTIONS.find((i) => i.name === iconName)?.Icon ?? Folder;
}

type Project = {
  id: number;
  name: string;
  color: string;
  icon?: string | null;
};

/* -------------------------------------------------------------------------- */
/*                                   Page                                     */
/* -------------------------------------------------------------------------- */

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [name, setName] = useState("");
  const [color, setColor] = useState(COLOR_OPTIONS[0]);
  const [icon, setIcon] = useState("folder");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState(COLOR_OPTIONS[0]);
  const [editIcon, setEditIcon] = useState("folder");
  const [savingEdit, setSavingEdit] = useState(false);

  async function loadProjects() {
    try {
      const res = await fetch("/api/projects");
      if (!res.ok) throw new Error(`Failed to load (${res.status})`);
      setProjects(await res.json());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load projects");
    }
  }

  useEffect(() => {
    loadProjects();
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), color, icon }),
      });
      if (!res.ok) throw new Error(`Failed to create (${res.status})`);
      setName("");
      setColor(COLOR_OPTIONS[0]);
      setIcon("folder");
      setShowAdvanced(false);
      await loadProjects();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create project");
    } finally {
      setLoading(false);
    }
  }

  function startEdit(project: Project) {
    setEditingId(project.id);
    setEditName(project.name);
    setEditColor(project.color);
    setEditIcon(project.icon ?? "folder");
  }
  function cancelEdit() {
    setEditingId(null);
  }

  async function handleSaveEdit() {
    if (!editingId || !editName.trim()) return;
    setSavingEdit(true);
    try {
      const res = await fetch(`/api/projects/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName.trim(),
          color: editColor,
          icon: editIcon,
        }),
      });
      if (!res.ok) throw new Error(`Failed to save (${res.status})`);
      cancelEdit();
      await loadProjects();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save project");
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleDelete(id: number, name: string) {
    if (
      !confirm(
        `Delete "${name}"? All associated tasks will also be removed.`
      )
    )
      return;
    try {
      const res = await fetch(`/api/projects/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`Failed to delete (${res.status})`);
      setProjects(projects.filter((p) => p.id !== id));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete project");
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-6 pt-20 pb-12 sm:px-10 sm:pt-14">
      <header className="mb-6">
        <h1 className="text-[28px] font-semibold leading-tight tracking-tight sm:text-[32px]">
          Projects
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Organize your tasks by area of your life.
        </p>
      </header>

      {error && (
        <div className="mb-4 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Quick add */}
      <form
        onSubmit={handleSubmit}
        className="mb-6 rounded-2xl bg-card p-4 shadow-card"
      >
        <div className="flex flex-wrap items-center gap-2">
          <span
            aria-hidden
            className="ml-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
            style={{ backgroundColor: color }}
          />
          <input
            type="text"
            placeholder="New project…"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="min-w-0 flex-1 bg-transparent px-1 py-2 text-[15px] text-foreground placeholder:text-muted-foreground focus:outline-none"
            required
          />
          <button
            type="button"
            onClick={() => setShowAdvanced((v) => !v)}
            className="inline-flex items-center gap-1 rounded-md px-2 py-2 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-expanded={showAdvanced}
          >
            {showAdvanced ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            Color & icon
          </button>
          <button
            type="submit"
            disabled={loading || !name.trim()}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            <Plus size={13} />
            Add
          </button>
        </div>

        {showAdvanced && (
          <div className="mt-3 flex flex-col gap-3 border-t border-border pt-3">
            <ColorPicker selected={color} onSelect={setColor} />
            <IconPicker selected={icon} onSelect={setIcon} />
          </div>
        )}
      </form>

      {/* Project list */}
      {projects.length === 0 ? (
        <div className="rounded-2xl bg-card px-5 py-10 text-center shadow-card">
          <p className="text-sm font-medium text-foreground">
            No projects yet.
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Create your first project above to start organizing.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col">
          {projects.map((project) => {
            const Icon = getIconComponent(project.icon ?? "folder");
            const isEditing = editingId === project.id;
            const displayColor = isEditing ? editColor : project.color;
            return (
              <li
                key={project.id}
                className={`group/row flex flex-col rounded-lg px-2 transition-colors ${
                  isEditing ? "bg-muted/40" : "hover:bg-muted/40"
                }`}
              >
                <div className="flex items-center gap-3 py-2.5">
                  <Icon
                    size={18}
                    style={{ color: displayColor }}
                    className="shrink-0"
                  />
                  <Link
                    href={`/tasks?projectId=${project.id}`}
                    className="flex-1 truncate text-[15px] text-foreground hover:underline"
                    title="View tasks for this project"
                  >
                    {project.name}
                  </Link>
                  <span
                    aria-hidden
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: displayColor }}
                  />
                  <div className="flex items-center opacity-0 transition-opacity focus-within:opacity-100 group-hover/row:opacity-100">
                    <button
                      onClick={() =>
                        isEditing ? cancelEdit() : startEdit(project)
                      }
                      aria-label={isEditing ? "Cancel" : "Edit"}
                      title={isEditing ? "Cancel" : "Edit"}
                      className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                      {isEditing ? <X size={13} /> : <Pencil size={13} />}
                    </button>
                    <button
                      onClick={() => handleDelete(project.id, project.name)}
                      aria-label="Delete"
                      className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                {isEditing && (
                  <div className="mb-2 ml-7 mr-1 flex flex-col gap-3 rounded-lg bg-background p-3 shadow-card">
                    <input
                      type="text"
                      placeholder="Project name"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="rounded-md bg-muted/60 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"
                      required
                    />
                    <ColorPicker
                      selected={editColor}
                      onSelect={setEditColor}
                    />
                    <IconPicker selected={editIcon} onSelect={setEditIcon} />
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={cancelEdit}
                        className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
                      >
                        <X size={12} /> Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveEdit}
                        disabled={savingEdit}
                        className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
                      >
                        <Save size={12} /> Save
                      </button>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                              Subcomponents                                 */
/* -------------------------------------------------------------------------- */

function ColorPicker({
  selected,
  onSelect,
}: {
  selected: string;
  onSelect: (c: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        Color
      </span>
      <div className="flex flex-wrap gap-1.5">
        {COLOR_OPTIONS.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => onSelect(c)}
            className="relative flex h-7 w-7 items-center justify-center rounded-full transition-transform hover:scale-110"
            style={{ backgroundColor: c }}
            aria-label={`Color ${c}`}
            aria-pressed={selected === c}
          >
            {selected === c && (
              <Check size={14} className="text-white drop-shadow" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

function IconPicker({
  selected,
  onSelect,
}: {
  selected: string;
  onSelect: (n: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        Icon
      </span>
      <div className="flex flex-wrap gap-1">
        {ICON_OPTIONS.map(({ name: iconName, Icon }) => {
          const isSelected = selected === iconName;
          return (
            <button
              key={iconName}
              type="button"
              onClick={() => onSelect(iconName)}
              className={`flex h-8 w-8 items-center justify-center rounded-md transition-colors ${
                isSelected
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
              aria-pressed={isSelected}
              aria-label={`Icon ${iconName}`}
            >
              <Icon size={15} />
            </button>
          );
        })}
      </div>
    </div>
  );
}
