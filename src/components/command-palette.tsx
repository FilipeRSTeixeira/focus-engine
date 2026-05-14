"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import * as RadixDialog from "@radix-ui/react-dialog";
import {
  LayoutDashboard,
  ListTodo,
  Timer,
  CalendarDays,
  NotebookPen,
  Award,
  Gift,
  Folder,
  Plus,
  Settings,
  Sun,
  Moon,
  Monitor,
  Search,
} from "lucide-react";
import { useTheme, type ThemePreference } from "./theme-provider";

/* -------------------------------------------------------------------------- */
/*                                  Types                                     */
/* -------------------------------------------------------------------------- */

type Project = { id: number; name: string; color: string };
type Reward = {
  id: number;
  title: string;
  point_cost: number;
  status: string;
};
type TaskLite = {
  id: number;
  title: string;
  status: string;
  project: { name: string; color: string } | null;
};

type Ctx = {
  open: boolean;
  setOpen: (v: boolean) => void;
  toggle: () => void;
};

const CommandPaletteContext = createContext<Ctx | null>(null);

export function useCommandPalette(): Ctx {
  const ctx = useContext(CommandPaletteContext);
  if (!ctx) {
    throw new Error(
      "useCommandPalette must be used within a CommandPaletteProvider"
    );
  }
  return ctx;
}

/* -------------------------------------------------------------------------- */
/*                              Keyboard helpers                              */
/* -------------------------------------------------------------------------- */

/**
 * True when the event originated inside an editable element. We use this
 * to avoid stealing single-key shortcuts (like "Space" or letters) from
 * inputs/textareas/contenteditable surfaces.
 */
function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (target.isContentEditable) return true;
  return false;
}

/* -------------------------------------------------------------------------- */
/*                                 Provider                                   */
/* -------------------------------------------------------------------------- */

export function CommandPaletteProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { setPreference } = useTheme();

  const toggle = useCallback(() => setOpen((v) => !v), []);

  /* ------------------------- Global keyboard map ------------------------- */
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const mod = e.metaKey || e.ctrlKey;

      // ⌘K — toggle palette (always, even from inputs)
      if (mod && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
        return;
      }

      // Esc — close palette (only when open; otherwise let the page handle it)
      if (e.key === "Escape" && open) {
        // cmdk's Dialog handles this itself, but we cover the case where it's
        // not registered yet.
        setOpen(false);
        return;
      }

      // The remaining shortcuts must not steal focus from inputs.
      if (isEditableTarget(e.target)) return;

      // ⌘N — new task
      if (mod && e.key.toLowerCase() === "n") {
        e.preventDefault();
        router.push("/tasks?new=1");
        return;
      }

      // ⌘1..6 — jump to a section
      if (mod && /^[1-6]$/.test(e.key)) {
        e.preventDefault();
        const map: Record<string, string> = {
          "1": "/",
          "2": "/tasks",
          "3": "/focus",
          "4": "/daily-review",
          "5": "/rewards",
          "6": "/achievements",
        };
        router.push(map[e.key]);
        return;
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, router, setPreference]);

  const value = useMemo<Ctx>(
    () => ({ open, setOpen, toggle }),
    [open, toggle]
  );

  return (
    <CommandPaletteContext.Provider value={value}>
      {children}
      <CommandPalette />
    </CommandPaletteContext.Provider>
  );
}

/* -------------------------------------------------------------------------- */
/*                                 Palette UI                                 */
/* -------------------------------------------------------------------------- */

function CommandPalette() {
  const { open, setOpen } = useCommandPalette();
  const router = useRouter();
  const { setPreference } = useTheme();

  const [projects, setProjects] = useState<Project[]>([]);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [tasks, setTasks] = useState<TaskLite[]>([]);
  const [loaded, setLoaded] = useState(false);

  // Lazy-load dynamic items the first time the palette is opened.
  useEffect(() => {
    if (!open || loaded) return;
    let cancelled = false;
    (async () => {
      try {
        const [pRes, rRes, tRes] = await Promise.all([
          fetch("/api/projects"),
          fetch("/api/rewards"),
          fetch("/api/tasks?status=pending"),
        ]);
        const [pData, rData, tData] = await Promise.all([
          pRes.ok ? pRes.json() : [],
          rRes.ok ? rRes.json() : [],
          tRes.ok ? tRes.json() : [],
        ]);
        if (cancelled) return;
        setProjects(Array.isArray(pData) ? pData : []);
        setRewards(Array.isArray(rData) ? rData : []);
        setTasks(Array.isArray(tData) ? tData.slice(0, 20) : []);
        setLoaded(true);
      } catch {
        setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, loaded]);

  // Reset cache when the palette closes so re-open gets fresh data after edits.
  useEffect(() => {
    if (!open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoaded(false);
    }
  }, [open]);

  const go = useCallback(
    (path: string) => {
      setOpen(false);
      router.push(path);
    },
    [router, setOpen]
  );

  const pickTheme = useCallback(
    (pref: ThemePreference) => {
      setPreference(pref);
      setOpen(false);
    },
    [setPreference, setOpen]
  );

  const activateReward = useCallback(
    async (id: number) => {
      setOpen(false);
      try {
        await fetch(`/api/rewards/${id}/activate`, { method: "POST" });
        router.push("/rewards");
      } catch {
        /* ignore */
      }
    },
    [router, setOpen]
  );

  return (
    <Command.Dialog
      open={open}
      onOpenChange={setOpen}
      label="Command palette"
      overlayClassName="fixed inset-0 z-[60] bg-foreground/30 backdrop-blur-[2px] animate-in fade-in"
      contentClassName="fixed left-1/2 top-[18%] z-[61] w-[min(640px,92vw)] -translate-x-1/2 overflow-hidden rounded-2xl border border-border bg-popover text-popover-foreground shadow-popover animate-in fade-in zoom-in-95 focus:outline-none"
    >
      {/*
       * Radix Dialog (which cmdk renders under the hood) requires a
       * `DialogTitle` child for screen-reader accessibility — the `label`
       * prop on Command.Dialog only sets `aria-label`, which is no longer
       * enough. Without this, Radix logs an error on every hydration that
       * was breaking client bootstrap on iPadOS Safari.
       */}
      <RadixDialog.Title className="sr-only">Command palette</RadixDialog.Title>
      <RadixDialog.Description className="sr-only">
        Search tasks, projects and rewards, or jump to any section of the app.
      </RadixDialog.Description>

      <div className="flex items-center gap-2 border-b border-border px-4">
        <Search size={15} className="text-muted-foreground" />
        <Command.Input
          autoFocus
          placeholder="Type a command, search a task or project…"
          className="h-12 w-full bg-transparent text-[15px] placeholder:text-muted-foreground focus:outline-none"
        />
        <Kbd>esc</Kbd>
      </div>

      <Command.List className="max-h-[60vh] overflow-y-auto p-2">
        <Command.Empty className="px-3 py-8 text-center text-sm text-muted-foreground">
          No results.
        </Command.Empty>

        <Command.Group
          heading="Quick actions"
          className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.08em] [&_[cmdk-group-heading]]:text-muted-foreground"
        >
          <Item
            icon={<Plus size={15} />}
            label="New task"
            shortcut={["⌘", "N"]}
            onSelect={() => go("/tasks?new=1")}
          />
          <Item
            icon={<Timer size={15} style={{ color: "#FF3B30" }} />}
            label="Start focus"
            onSelect={() => go("/focus")}
          />
          <Item
            icon={<NotebookPen size={15} style={{ color: "#34C759" }} />}
            label="Daily review"
            onSelect={() => go("/daily-review")}
          />
        </Command.Group>

        <Command.Group
          heading="Go to"
          className="mt-1 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.08em] [&_[cmdk-group-heading]]:text-muted-foreground"
        >
          <Item
            icon={<LayoutDashboard size={15} style={{ color: "#3478F6" }} />}
            label="Today"
            shortcut={["⌘", "1"]}
            onSelect={() => go("/")}
          />
          <Item
            icon={<ListTodo size={15} style={{ color: "#FFC107" }} />}
            label="Tasks"
            shortcut={["⌘", "2"]}
            onSelect={() => go("/tasks")}
          />
          <Item
            icon={<Timer size={15} style={{ color: "#FF3B30" }} />}
            label="Focus"
            shortcut={["⌘", "3"]}
            onSelect={() => go("/focus")}
          />
          <Item
            icon={<NotebookPen size={15} style={{ color: "#34C759" }} />}
            label="Daily Review"
            shortcut={["⌘", "4"]}
            onSelect={() => go("/daily-review")}
          />
          <Item
            icon={<Gift size={15} style={{ color: "#AF52DE" }} />}
            label="Rewards"
            shortcut={["⌘", "5"]}
            onSelect={() => go("/rewards")}
          />
          <Item
            icon={<Award size={15} style={{ color: "#FF9500" }} />}
            label="Achievements"
            shortcut={["⌘", "6"]}
            onSelect={() => go("/achievements")}
          />
          <Item
            icon={<CalendarDays size={15} style={{ color: "#8E8E93" }} />}
            label="History"
            onSelect={() => go("/history")}
          />
          <Item
            icon={<Folder size={15} style={{ color: "#8E8E93" }} />}
            label="Projects"
            onSelect={() => go("/projects")}
          />
          <Item
            icon={<Settings size={15} style={{ color: "#8E8E93" }} />}
            label="Settings"
            onSelect={() => go("/settings")}
          />
        </Command.Group>

        {projects.length > 0 && (
          <Command.Group
            heading="Projects"
            className="mt-1 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.08em] [&_[cmdk-group-heading]]:text-muted-foreground"
          >
            {projects.map((p) => (
              <Item
                key={`proj-${p.id}`}
                icon={
                  <span
                    aria-hidden
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: p.color }}
                  />
                }
                label={p.name}
                value={`project ${p.name}`}
                onSelect={() => go(`/tasks?projectId=${p.id}`)}
              />
            ))}
          </Command.Group>
        )}

        {tasks.length > 0 && (
          <Command.Group
            heading="Pending tasks"
            className="mt-1 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.08em] [&_[cmdk-group-heading]]:text-muted-foreground"
          >
            {tasks.map((t) => (
              <Item
                key={`task-${t.id}`}
                icon={
                  <span
                    aria-hidden
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: t.project?.color ?? "#8E8E93" }}
                  />
                }
                label={t.title}
                trailing={t.project?.name ?? ""}
                value={`task ${t.title} ${t.project?.name ?? ""}`}
                onSelect={() => go(`/focus?taskId=${t.id}`)}
              />
            ))}
          </Command.Group>
        )}

        {rewards.filter((r) => r.status === "available").length > 0 && (
          <Command.Group
            heading="Activate reward"
            className="mt-1 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.08em] [&_[cmdk-group-heading]]:text-muted-foreground"
          >
            {rewards
              .filter((r) => r.status === "available")
              .map((r) => (
                <Item
                  key={`reward-${r.id}`}
                  icon={<Gift size={15} style={{ color: "#AF52DE" }} />}
                  label={r.title}
                  trailing={`${r.point_cost} pts`}
                  value={`reward ${r.title}`}
                  onSelect={() => activateReward(r.id)}
                />
              ))}
          </Command.Group>
        )}

        <Command.Group
          heading="Theme"
          className="mt-1 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.08em] [&_[cmdk-group-heading]]:text-muted-foreground"
        >
          <Item
            icon={<Sun size={15} />}
            label="Light theme"
            onSelect={() => pickTheme("light")}
          />
          <Item
            icon={<Moon size={15} />}
            label="Dark theme"
            onSelect={() => pickTheme("dark")}
          />
          <Item
            icon={<Monitor size={15} />}
            label="System theme"
            onSelect={() => pickTheme("system")}
          />
        </Command.Group>
      </Command.List>

      <div className="flex items-center justify-between border-t border-border bg-muted/40 px-3 py-2 text-[11px] text-muted-foreground">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1">
            <Kbd>↑</Kbd>
            <Kbd>↓</Kbd>
            navigate
          </span>
          <span className="inline-flex items-center gap-1">
            <Kbd>↵</Kbd>
            select
          </span>
        </div>
        <span className="inline-flex items-center gap-1">
          <Kbd>⌘</Kbd>
          <Kbd>K</Kbd>
          to toggle
        </span>
      </div>
    </Command.Dialog>
  );
}

/* -------------------------------------------------------------------------- */
/*                              Sub-components                                */
/* -------------------------------------------------------------------------- */

function Item({
  icon,
  label,
  trailing,
  shortcut,
  value,
  onSelect,
}: {
  icon: React.ReactNode;
  label: string;
  trailing?: string;
  shortcut?: string[];
  value?: string;
  onSelect: () => void;
}) {
  return (
    <Command.Item
      value={value ?? label}
      onSelect={onSelect}
      className="group/item flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 text-[14px] text-foreground aria-selected:bg-accent aria-selected:text-accent-foreground"
    >
      <span className="flex h-5 w-5 shrink-0 items-center justify-center text-muted-foreground group-aria-selected/item:text-foreground">
        {icon}
      </span>
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {trailing && (
        <span className="text-xs tabular-nums text-muted-foreground">
          {trailing}
        </span>
      )}
      {shortcut && (
        <span className="flex items-center gap-1">
          {shortcut.map((k, i) => (
            <Kbd key={i}>{k}</Kbd>
          ))}
        </span>
      )}
    </Command.Item>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex h-5 min-w-[20px] items-center justify-center rounded border border-border bg-background px-1 font-sans text-[10px] font-medium text-muted-foreground">
      {children}
    </kbd>
  );
}
