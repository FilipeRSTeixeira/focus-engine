"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { X, AlertCircle, Monitor, Zap } from "lucide-react";
import { PomodoroTimer } from "@/components/pomodoro-timer";
import { FocusMode } from "@/components/focus-mode";
import { TimerProfileSelector } from "@/components/timer-profile-selector";
import { TimerProfileManager } from "@/components/timer-profile-manager";
import { PRIORITY_COLORS } from "@/lib/colors";
import { Skeleton } from "@/components/skeleton";

type SessionType = "work" | "break";

type TimerProfile = {
  id: number;
  name: string;
  workMinutes: number;
  breakMinutes: number;
  isActive: boolean;
  isDefault: boolean;
};

const TIPS = [
  "Focus on one thing. Close the other tabs.",
  "You only need 2 minutes to get started.",
  "What is the most urgent thing on your list?",
  "Completing this task is already progress.",
];

function FocusContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const taskId = searchParams.get("taskId");

  const [task, setTask] = useState<{
    id: number;
    title: string;
    description?: string;
    priority: string;
    project: { name: string; color: string };
  } | null>(null);
  const [pendingTasks, setPendingTasks] = useState<
    {
      id: number;
      title: string;
      description?: string | null;
      priority: string;
      project: { name: string; color: string };
    }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [pendingSession, setPendingSession] = useState<{
    type: SessionType;
    duration: number;
  } | null>(null);
  const [note, setNote] = useState("");
  const [focusLost, setFocusLost] = useState(false);
  const [tip, setTip] = useState<string | null>(null);
  const [inFocusMode, setInFocusMode] = useState(false);
  const [activeSessionError, setActiveSessionError] = useState<string | null>(
    null
  );
  const [activeProfile, setActiveProfile] = useState<TimerProfile | null>(null);
  const [showManager, setShowManager] = useState(false);

  useEffect(() => {
    if (!taskId) {
      loadPendingTasks();
      setLoading(false);
      return;
    }
    loadTask();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskId]);

  async function loadPendingTasks() {
    try {
      const res = await fetch("/api/tasks?status=pending");
      if (!res.ok) throw new Error();
      const data: {
        id: number;
        title: string;
        description?: string | null;
        priority: string;
        status: string;
        project: { name: string; color: string };
      }[] = await res.json();
      setPendingTasks(data.filter((t) => t.status === "pending"));
    } catch {
      setPendingTasks([]);
    }
  }

  async function loadTask() {
    if (!taskId) return;
    try {
      const res = await fetch(`/api/focus?taskId=${taskId}`);
      const data = await res.json();

      if (data.activeSession || data.activeTask) {
        setActiveSessionError(data.message);
        setLoading(false);
        return;
      }

      if (data.notFound) {
        setLoading(false);
        return;
      }

      if (data.task) {
        setTask({
          id: data.task.id,
          title: data.task.title,
          description: data.task.description ?? undefined,
          priority: data.task.priority,
          project: data.task.project,
        });
      }
    } catch {
      setActiveSessionError("Failed to load task");
    }
    setLoading(false);
  }

  const handleSessionComplete = useCallback(
    async (type: SessionType, duration: number) => {
      if (type === "work" && task) {
        setPendingSession({ type, duration });
        setShowNoteModal(true);
      }
    },
    [task]
  );

  async function submitNote() {
    if (!pendingSession || !task) return;
    await fetch("/api/focus/reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        taskId: task.id,
        durationMinutes: pendingSession.duration,
        type: pendingSession.type,
        note: note.trim() || undefined,
        focusLost,
      }),
    });
    setShowNoteModal(false);
    setNote("");
    setFocusLost(false);
    setPendingSession(null);
    router.push("/tasks");
  }

  function toggleFocusLost() {
    setFocusLost((prev) => !prev);
    if (!focusLost) {
      setTip(TIPS[Math.floor(Math.random() * TIPS.length)]);
    } else {
      setTip(null);
    }
  }

  /* ---------------------------- Render ----------------------------------- */

  if (loading) {
    return (
      <div
        className="mx-auto max-w-md px-6 pt-20 pb-8 sm:px-10 sm:pt-14"
        aria-busy="true"
      >
        <Skeleton className="mb-2 h-9 w-32" />
        <Skeleton className="mb-6 h-4 w-44" />
        <Skeleton className="mb-2 h-12 w-full" />
        <Skeleton className="mb-2 h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  if (activeSessionError) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 px-6 text-center">
        <AlertCircle size={40} style={{ color: "#FFC107" }} />
        <h2 className="text-xl font-semibold tracking-tight">
          {activeSessionError}
        </h2>
        <p className="text-sm text-muted-foreground">
          Complete or end the current session before starting another.
        </p>
        <button
          onClick={() => router.push("/tasks")}
          className="rounded-full bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
        >
          Back to Tasks
        </button>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="mx-auto max-w-md px-6 pt-20 pb-8 sm:px-10 sm:pt-14">
        <header className="mb-6">
          <h1 className="text-[28px] font-semibold leading-tight tracking-tight sm:text-[32px]">
            Focus
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Choose a task to focus on.
          </p>
        </header>

        {pendingTasks.length === 0 ? (
          <div className="rounded-2xl bg-card px-5 py-10 text-center shadow-card">
            <p className="text-sm font-medium text-foreground">
              No pending tasks.
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Create a task first to start focusing.
            </p>
            <button
              onClick={() => router.push("/tasks")}
              className="mt-4 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
            >
              Go to Tasks
            </button>
          </div>
        ) : (
          <ul className="flex flex-col">
            {pendingTasks.map((t) => (
              <li key={t.id}>
                <button
                  onClick={() => router.push(`/focus?taskId=${t.id}`)}
                  className="group/row flex w-full items-start gap-3 rounded-lg px-2 py-2.5 text-left transition-colors hover:bg-muted/40"
                >
                  <span
                    aria-hidden
                    className="mt-1.5 inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: t.project?.color }}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[15px] text-foreground">
                      {t.title}
                    </div>
                    {t.description && (
                      <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                        {t.description}
                      </p>
                    )}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  if (inFocusMode && task) {
    return (
      <FocusMode
        taskId={task.id}
        taskTitle={task.title}
        taskDescription={task.description}
        taskPriority={task.priority}
        projectColor={task.project.color}
        onExit={() => setInFocusMode(false)}
        workMinutes={activeProfile?.workMinutes}
        breakMinutes={activeProfile?.breakMinutes}
      />
    );
  }

  return (
    <div className="mx-auto max-w-md px-6 pt-20 pb-8 sm:px-10 sm:pt-14">
      {/* Task header */}
      <div className="mb-5 text-center">
        <div className="flex items-center justify-center gap-2">
          <span
            aria-hidden
            className="inline-block h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: task.project.color }}
          />
          <span className="text-xs uppercase tracking-wider text-muted-foreground">
            {task.project.name}
          </span>
        </div>
        <h1
          className="mt-2 text-xl font-semibold tracking-tight sm:text-2xl"
          style={{ color: PRIORITY_COLORS[task.priority] }}
        >
          {task.title}
        </h1>
        {task.description && (
          <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
            {task.description}
          </p>
        )}
      </div>

      {/* Profile selector */}
      <div className="mb-2 flex justify-center">
        <TimerProfileSelector
          onProfileChange={setActiveProfile}
          onOpenManager={() => setShowManager(true)}
        />
      </div>

      {/* Timer */}
      <PomodoroTimer
        workMinutes={activeProfile?.workMinutes}
        breakMinutes={activeProfile?.breakMinutes}
        onSessionComplete={handleSessionComplete}
      />

      {/* Extras */}
      <div className="mt-2 flex flex-col items-center gap-2">
        <button
          onClick={() => setInFocusMode(true)}
          className="inline-flex items-center gap-2 rounded-full bg-muted px-4 py-2.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <Monitor size={15} />
          Focus Mode
        </button>

        <button
          onClick={toggleFocusLost}
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs transition-colors ${
            focusLost
              ? ""
              : "text-muted-foreground hover:text-foreground"
          }`}
          style={
            focusLost
              ? { backgroundColor: "rgba(255,193,7,0.12)", color: "#FFB020" }
              : undefined
          }
        >
          I lost focus
        </button>
      </div>

      {/* Focus-lost tip modal */}
      {tip && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 px-4 backdrop-blur-sm"
          onClick={() => {
            setFocusLost(false);
            setTip(null);
          }}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-popover p-5 shadow-popover sm:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center gap-2">
              <Zap size={16} style={{ color: "#FFC107" }} />
              <h3 className="text-base font-semibold tracking-tight sm:text-lg">
                Lost focus?
              </h3>
            </div>
            <p className="mb-4 text-sm text-muted-foreground">{tip}</p>
            <button
              onClick={() => {
                setFocusLost(false);
                setTip(null);
              }}
              className="w-full rounded-md bg-primary py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
            >
              Got it
            </button>
          </div>
        </div>
      )}

      {/* Session complete modal */}
      {showNoteModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4 backdrop-blur-sm"
          onClick={() => {
            setShowNoteModal(false);
            setPendingSession(null);
            setNote("");
            setFocusLost(false);
          }}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-popover p-5 shadow-popover sm:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-semibold tracking-tight sm:text-lg">
                Session complete
              </h3>
              <button
                onClick={() => {
                  setShowNoteModal(false);
                  setPendingSession(null);
                  setNote("");
                  setFocusLost(false);
                }}
                className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label="Close"
              >
                <X size={17} />
              </button>
            </div>

            <p className="mb-4 text-sm text-muted-foreground">
              {pendingSession?.duration} min session complete.
            </p>

            <label className="mb-2 block text-xs font-medium text-muted-foreground">
              Note (optional)
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="How did it go?"
              rows={3}
              className="mb-4 w-full rounded-md bg-muted/60 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"
            />

            <button
              onClick={submitNote}
              className="w-full rounded-md bg-primary py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* Profile manager */}
      <TimerProfileManager
        open={showManager}
        onClose={() => setShowManager(false)}
        onProfileChange={(profile) => {
          setActiveProfile(profile);
          setShowManager(false);
        }}
      />
    </div>
  );
}

export default function FocusPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-md px-6 pt-20 pb-8 sm:px-10 sm:pt-14" aria-busy="true">
          <Skeleton className="mb-2 h-9 w-32" />
          <Skeleton className="mb-6 h-4 w-44" />
          <Skeleton className="h-12 w-full" />
        </div>
      }
    >
      <FocusContent />
    </Suspense>
  );
}
