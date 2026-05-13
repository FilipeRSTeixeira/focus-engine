"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Play, Pause, RotateCcw } from "lucide-react";
import { TIMER_COLORS } from "@/lib/colors";

type SessionType = "work" | "break";

function playAlarm(type: SessionType) {
  const AudioContextClass =
    window.AudioContext ||
    (window as Window & { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext!;
  const ctx = new AudioContextClass();
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();

  oscillator.connect(gain);
  gain.connect(ctx.destination);

  oscillator.frequency.value = type === "work" ? 880 : 660;
  oscillator.type = "sine";
  gain.gain.setValueAtTime(0.3, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);

  oscillator.start(ctx.currentTime);
  oscillator.stop(ctx.currentTime + 0.5);
  oscillator.addEventListener("ended", () => {
    ctx.close().catch(() => {
      /* already closed */
    });
  });
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

function CircularProgress({
  progress,
  type,
}: {
  progress: number;
  type: SessionType;
}) {
  const size = 280;
  const strokeWidth = 6;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - progress);
  const color = TIMER_COLORS[type];

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="h-56 w-56 -rotate-90 transform sm:h-72 sm:w-72"
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        className="text-muted"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        className="transition-[stroke-dashoffset] duration-100"
      />
    </svg>
  );
}

export function PomodoroTimer({
  workMinutes,
  breakMinutes,
  onSessionComplete,
}: {
  workMinutes?: number;
  breakMinutes?: number;
  onSessionComplete?: (type: SessionType, duration: number) => void;
}) {
  const effectiveWork = workMinutes ?? 25;
  const effectiveBreak = breakMinutes ?? 5;

  const [type, setType] = useState<SessionType>("work");
  const [timeLeft, setTimeLeft] = useState(effectiveWork * 60);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const totalSeconds =
    type === "work" ? effectiveWork * 60 : effectiveBreak * 60;
  const progress = 1 - timeLeft / totalSeconds;

  useEffect(() => {
    if (!running) {
      setTimeLeft(totalSeconds);
    }
  }, [totalSeconds, running]);

  const switchSession = useCallback(() => {
    playAlarm(type);
    if (type === "work" && onSessionComplete) {
      onSessionComplete("work", effectiveWork);
    }
    const nextType = type === "work" ? "break" : "work";
    setType(nextType);
    setTimeLeft(nextType === "work" ? effectiveWork * 60 : effectiveBreak * 60);
  }, [type, effectiveWork, effectiveBreak, onSessionComplete]);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            switchSession();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running, switchSession]);

  function handleStart() {
    setRunning(true);
  }
  function handlePause() {
    setRunning(false);
  }
  function handleReset() {
    setRunning(false);
    setType("work");
    setTimeLeft(effectiveWork * 60);
  }

  return (
    <div className="flex flex-col items-center gap-6 py-6 sm:gap-8 sm:py-8">
      <div className="relative">
        <CircularProgress progress={progress} type={type} />
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-mono text-4xl font-semibold tracking-tight sm:text-5xl">
            {formatTime(timeLeft)}
          </span>
          <span
            className="mt-2 text-[11px] font-semibold uppercase tracking-[0.12em] sm:text-xs"
            style={{ color: TIMER_COLORS[type] }}
          >
            {type === "work" ? "Foco" : "Pausa"}
          </span>
        </div>
      </div>

      <div className="flex w-full items-center justify-center gap-3 px-4">
        {!running ? (
          <button
            onClick={handleStart}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-primary py-3.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 sm:flex-none sm:px-6"
          >
            <Play size={16} />
            Começar
          </button>
        ) : (
          <button
            onClick={handlePause}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-primary py-3.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 sm:flex-none sm:px-6"
          >
            <Pause size={16} />
            Pausar
          </button>
        )}
        <button
          onClick={handleReset}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-muted py-3.5 text-sm font-medium text-foreground transition-colors hover:bg-accent sm:flex-none sm:px-4"
        >
          <RotateCcw size={14} />
          Reiniciar
        </button>
      </div>
    </div>
  );
}
