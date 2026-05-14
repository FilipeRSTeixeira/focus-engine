"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  LayoutDashboard,
  ListTodo,
  Gift,
  Timer,
  CalendarDays,
  NotebookPen,
  Award,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  Calendar,
  Folder,
  Inbox,
  Settings2,
  Settings,
  Search,
  Activity,
} from "lucide-react";
import { SidebarPointsBadge } from "./sidebar-points-badge";
import { ThemeToggle } from "./theme-toggle";
import { useCommandPalette } from "./command-palette";

/**
 * Things-inspired sidebar
 *
 * Structure (from top to bottom):
 *   1. MAIN     — Dashboard, Tasks, Focus
 *   2. PLAN    — Daily Review, History
 *   3. PROGRESS — Rewards, Achievements
 *   4. PROJECTS — dynamic list of user projects (with colour dots)
 *   5. Footer   — Google Calendar status, ThemeToggle, Points/Streak badge
 *
 * Each main nav item carries a "tone" that controls the icon colour, in the
 * spirit of Things' Today=yellow / Upcoming=red iconography.
 */

type Tone = "blue" | "yellow" | "red" | "green" | "purple" | "orange" | "gray";

type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  tone: Tone;
};

const TONE_COLOR: Record<Tone, string> = {
  blue: "#3478F6",
  yellow: "#FFC107",
  red: "#FF3B30",
  green: "#34C759",
  purple: "#AF52DE",
  orange: "#FF9500",
  gray: "#8E8E93",
};

const MAIN_NAV: NavItem[] = [
  { href: "/", label: "Today", icon: LayoutDashboard, tone: "blue" },
  { href: "/tasks", label: "Tasks", icon: ListTodo, tone: "yellow" },
  { href: "/habits", label: "Habits", icon: Activity, tone: "green" },
  { href: "/focus", label: "Focus", icon: Timer, tone: "red" },
];

const PLAN_NAV: NavItem[] = [
  { href: "/daily-review", label: "Daily Review", icon: NotebookPen, tone: "green" },
  { href: "/history", label: "History", icon: CalendarDays, tone: "gray" },
];

const PROGRESS_NAV: NavItem[] = [
  { href: "/rewards", label: "Rewards", icon: Gift, tone: "purple" },
  { href: "/achievements", label: "Achievements", icon: Award, tone: "orange" },
];

const APP_NAV: NavItem[] = [
  { href: "/settings", label: "Settings", icon: Settings, tone: "gray" },
];

type Project = {
  id: number;
  name: string;
  color: string;
};

export function Sidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeProjectId = searchParams?.get("projectId");
  const { setOpen: setPaletteOpen } = useCommandPalette();

  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [gcalConnected, setGcalConnected] = useState<boolean | null>(null);
  const [gcalConfigured, setGcalConfigured] = useState<boolean>(false);
  const [projects, setProjects] = useState<Project[]>([]);

  useEffect(() => {
    fetch("/api/auth/google/status")
      .then((r) => r.json())
      .then((d) => {
        setGcalConnected(Boolean(d.connected));
        setGcalConfigured(Boolean(d.configured));
      })
      .catch(() => {
        setGcalConnected(false);
        setGcalConfigured(false);
      });
  }, [pathname]);

  useEffect(() => {
    fetch("/api/projects")
      .then((r) => r.json())
      .then((d: Project[]) => setProjects(d ?? []))
      .catch(() => setProjects([]));
  }, []);

  const handleNavClick = () => setMobileOpen(false);

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed left-3 top-3 z-40 flex h-10 w-10 items-center justify-center rounded-lg bg-card text-muted-foreground shadow-card transition-colors hover:text-foreground sm:hidden"
        aria-label="Open navigation"
      >
        <Menu size={18} />
      </button>

      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm sm:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex h-screen w-60 flex-col border-r border-sidebar-border bg-sidebar/85 text-sidebar-foreground backdrop-blur-xl transition-[transform,width] duration-200 supports-[backdrop-filter]:bg-sidebar/70 sm:relative sm:inset-auto sm:z-auto sm:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full sm:translate-x-0"
        } ${collapsed ? "sm:w-16" : "sm:w-60"}`}
      >
        {/* Mobile close */}
        <div className="flex items-center justify-between px-4 py-3 sm:hidden">
          <span className="text-sm font-semibold">Focus Engine</span>
          <button
            onClick={() => setMobileOpen(false)}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            aria-label="Close navigation"
          >
            <X size={18} />
          </button>
        </div>

        {/* Brand / desktop collapse toggle */}
        <div className="hidden h-12 items-center px-3 sm:flex">
          {!collapsed && (
            <span className="flex-1 truncate px-2 text-sm font-semibold tracking-tight">
              Focus Engine
            </span>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
        </div>

        {/* Quick search trigger — opens the command palette */}
        <div className="px-2 pb-2 pt-1">
          <button
            type="button"
            onClick={() => {
              setMobileOpen(false);
              setPaletteOpen(true);
            }}
            className={`group/qs flex w-full items-center gap-2 rounded-lg border border-sidebar-border bg-background/60 px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:border-sidebar-accent hover:text-foreground ${
              collapsed ? "justify-center" : ""
            }`}
            aria-label="Open command palette"
            title="Open command palette (Cmd+K)"
          >
            <Search size={13} className="shrink-0" />
            {!collapsed && (
              <>
                <span className="flex-1 text-left">Quick search…</span>
                <span className="flex items-center gap-0.5">
                  <kbd className="inline-flex h-4 min-w-[16px] items-center justify-center rounded border border-sidebar-border bg-sidebar px-1 font-sans text-[10px] font-medium">
                    ⌘
                  </kbd>
                  <kbd className="inline-flex h-4 min-w-[16px] items-center justify-center rounded border border-sidebar-border bg-sidebar px-1 font-sans text-[10px] font-medium">
                    K
                  </kbd>
                </span>
              </>
            )}
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-2 pb-3">
          <NavGroup label="Main" collapsed={collapsed}>
            {MAIN_NAV.map((item) => (
              <SidebarLink
                key={item.href}
                item={item}
                active={isActive(pathname, item.href) && !activeProjectId}
                collapsed={collapsed}
                onNavigate={handleNavClick}
              />
            ))}
          </NavGroup>

          <NavGroup label="Plan" collapsed={collapsed}>
            {PLAN_NAV.map((item) => (
              <SidebarLink
                key={item.href}
                item={item}
                active={isActive(pathname, item.href)}
                collapsed={collapsed}
                onNavigate={handleNavClick}
              />
            ))}
          </NavGroup>

          <NavGroup label="Progress" collapsed={collapsed}>
            {PROGRESS_NAV.map((item) => (
              <SidebarLink
                key={item.href}
                item={item}
                active={isActive(pathname, item.href)}
                collapsed={collapsed}
                onNavigate={handleNavClick}
              />
            ))}
          </NavGroup>

          <NavGroup label="App" collapsed={collapsed}>
            {APP_NAV.map((item) => (
              <SidebarLink
                key={item.href}
                item={item}
                active={isActive(pathname, item.href)}
                collapsed={collapsed}
                onNavigate={handleNavClick}
              />
            ))}
          </NavGroup>

          {/* Projects — dynamic */}
          <NavGroup
            label="Projects"
            collapsed={collapsed}
            action={
              !collapsed ? (
                <Link
                  href="/projects"
                  onClick={handleNavClick}
                  className="rounded p-1 text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  aria-label="Manage projects"
                  title="Manage projects"
                >
                  <Settings2 size={12} />
                </Link>
              ) : null
            }
          >
            {projects.length === 0 ? (
              !collapsed && (
                <Link
                  href="/projects"
                  onClick={handleNavClick}
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                >
                  <Inbox size={16} />
                  <span>Create first project</span>
                </Link>
              )
            ) : (
              projects.map((p) => {
                const isOnTasks = pathname === "/tasks";
                const isActiveProject =
                  isOnTasks && activeProjectId === String(p.id);
                return (
                  <Link
                    key={p.id}
                    href={`/tasks?projectId=${p.id}`}
                    onClick={handleNavClick}
                    title={p.name}
                    className={`group/sidebar flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                      isActiveProject
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
                    }`}
                  >
                    <span
                      aria-hidden
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: p.color }}
                    />
                    {!collapsed && (
                      <span className="truncate">{p.name}</span>
                    )}
                  </Link>
                );
              })
            )}
          </NavGroup>
        </nav>

        {/* Footer */}
        <div className="border-t border-sidebar-border px-2 py-2">
          {/* Google Calendar */}
          {gcalConnected === null ? null : gcalConnected ? (
            <Link
              href="/settings"
              onClick={handleNavClick}
              className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground ${
                collapsed ? "justify-center" : ""
              }`}
              title="Google Calendar connected — manage in Settings"
            >
              <Calendar size={14} style={{ color: TONE_COLOR.green }} />
              {!collapsed && <span>Calendar connected</span>}
            </Link>
          ) : gcalConfigured ? (
            <a
              href="/api/auth/google"
              className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground ${
                collapsed ? "justify-center" : ""
              }`}
              title="Connect Google Calendar"
            >
              <Calendar size={14} />
              {!collapsed && <span>Connect Calendar</span>}
            </a>
          ) : (
            <Link
              href="/settings"
              onClick={handleNavClick}
              className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground ${
                collapsed ? "justify-center" : ""
              }`}
              title="Configure Google credentials in Settings"
            >
              <Calendar size={14} />
              {!collapsed && <span>Set up Calendar</span>}
            </Link>
          )}

          {/* Theme toggle */}
          <ThemeToggle collapsed={collapsed} />

          {/* Points + streak */}
          <div className={collapsed ? "px-0 pt-1" : "px-2 pt-1"}>
            <SidebarPointsBadge collapsed={collapsed} />
          </div>
        </div>
      </aside>
    </>
  );
}

/* -------------------------------------------------------------------------- */
/*                              Subcomponents                                 */
/* -------------------------------------------------------------------------- */

function NavGroup({
  label,
  collapsed,
  action,
  children,
}: {
  label: string;
  collapsed: boolean;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-3 first:mt-1">
      {!collapsed && (
        <div className="mb-1 flex items-center justify-between px-3 pt-1">
          <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            {label}
          </span>
          {action}
        </div>
      )}
      <div className="flex flex-col gap-px">{children}</div>
    </div>
  );
}

function SidebarLink({
  item,
  active,
  collapsed,
  onNavigate,
}: {
  item: NavItem;
  active: boolean;
  collapsed: boolean;
  onNavigate: () => void;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      title={collapsed ? item.label : undefined}
      className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
        active
          ? "bg-sidebar-accent text-sidebar-accent-foreground"
          : "text-sidebar-foreground/85 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
      } ${collapsed ? "justify-center" : ""}`}
    >
      <Icon size={17} style={{ color: TONE_COLOR[item.tone] }} />
      {!collapsed && <span className="truncate">{item.label}</span>}
    </Link>
  );
}

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
