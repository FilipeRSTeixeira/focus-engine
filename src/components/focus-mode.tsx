"use client";

import { useEffect, useState, useRef } from "react";
import { X, Maximize2 } from "lucide-react";
import { PomodoroTimer } from "@/components/pomodoro-timer";
import { PRIORITY_COLORS } from "@/lib/colors";

export function FocusMode({
  taskId,
  taskTitle,
  taskDescription,
  taskPriority,
  projectColor,
  onExit,
  workMinutes,
  breakMinutes,
}: {
  taskId: number;
  taskTitle: string;
  taskDescription?: string;
  taskPriority: string;
  projectColor: string;
  onExit: () => void;
  workMinutes?: number;
  breakMinutes?: number;
}) {
  const [fullscreen, setFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        exitFocusMode();
      }
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function enterFullscreen() {
    if (containerRef.current) {
      containerRef.current.requestFullscreen?.();
      setFullscreen(true);
    }
  }

  function exitFocusMode() {
    if (document.fullscreenElement) {
      document.exitFullscreen?.();
    }
    setFullscreen(false);
    onExit();
  }

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background"
    >
      <button
        onClick={exitFocusMode}
        className="absolute right-3 top-3 z-50 flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:right-5 sm:top-5"
        aria-label="Exit focus mode"
      >
        <X size={18} />
      </button>

      {/* Task info */}
      <div className="mb-6 px-4 text-center sm:mb-8">
        <span
          aria-hidden
          className="inline-block h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: projectColor }}
        />
        <h1
          className="mt-2 text-xl font-semibold tracking-tight sm:text-2xl"
          style={{ color: PRIORITY_COLORS[taskPriority] }}
        >
          {taskTitle}
        </h1>
        {taskDescription && (
          <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
            {taskDescription}
          </p>
        )}
      </div>

      <PomodoroTimer
        workMinutes={workMinutes}
        breakMinutes={breakMinutes}
      />

      {!fullscreen && (
        <div className="px-4">
          <button
            onClick={enterFullscreen}
            className="mt-6 inline-flex items-center justify-center gap-2 rounded-full bg-muted px-4 py-2.5 text-sm text-muted-foreground transition-colors hover:text-foreground sm:mt-8"
          >
            <Maximize2 size={14} />
            Full screen
          </button>
        </div>
      )}
    </div>
  );
}
