"use client";

import { useState, useEffect, useCallback } from "react";
import { ChevronDown, Settings } from "lucide-react";

type TimerProfile = {
  id: number;
  name: string;
  workMinutes: number;
  breakMinutes: number;
  isActive: boolean;
  isDefault: boolean;
};

export function TimerProfileSelector({
  onProfileChange,
  onOpenManager,
}: {
  onProfileChange: (profile: TimerProfile) => void;
  onOpenManager?: () => void;
}) {
  const [profiles, setProfiles] = useState<TimerProfile[]>([]);
  const [active, setActive] = useState<TimerProfile | null>(null);
  const [open, setOpen] = useState(false);

  const loadProfiles = useCallback(async () => {
    try {
      const res = await fetch("/api/timer-profiles");
      const data = await res.json();
      setProfiles(data.profiles);
      setActive(data.active);
    } catch {
      setProfiles([]);
      setActive(null);
    }
  }, []);

  useEffect(() => {
    loadProfiles();
  }, [loadProfiles]);

  useEffect(() => {
    if (active) {
      onProfileChange(active);
    }
  }, [active, onProfileChange]);

  async function handleSelect(id: number) {
    try {
      const res = await fetch(`/api/timer-profiles/${id}/activate`, {
        method: "POST",
      });
      if (res.ok) {
        const data = await res.json();
        setActive(data.profile);
      }
    } catch {
      /* ignore */
    }
    setOpen(false);
  }

  function formatProfile(p: TimerProfile) {
    return `${p.name} · ${p.workMinutes}/${p.breakMinutes}`;
  }

  return (
    <div className="flex items-center gap-2">
      <div className="relative">
        <button
          onClick={() => setOpen(!open)}
          aria-label="Select timer profile"
          aria-expanded={open}
          className="inline-flex items-center gap-2 rounded-lg bg-muted px-3 py-2 text-sm text-foreground transition-colors hover:bg-accent"
        >
          <span className="max-w-[140px] truncate sm:max-w-[200px]">
            {active ? formatProfile(active) : "No profile"}
          </span>
          <ChevronDown size={13} className="text-muted-foreground" />
        </button>

        {open && (
          <>
            <div
              className="fixed inset-0 z-30"
              onClick={() => setOpen(false)}
            />
            <div className="absolute left-0 z-40 mt-1 w-60 overflow-hidden rounded-xl bg-popover shadow-popover">
              {profiles.map((p) => (
                <button
                  key={p.id}
                  onClick={() => handleSelect(p.id)}
                  className={`flex w-full items-center justify-between px-3 py-2.5 text-left text-sm transition-colors hover:bg-muted ${
                    p.isActive ? "bg-muted font-medium" : ""
                  }`}
                >
                  <span className="truncate">{p.name}</span>
                  <span className="ml-2 text-[11px] text-muted-foreground tabular-nums">
                    {p.workMinutes}/{p.breakMinutes}
                  </span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      <button
        onClick={() => {
          setOpen(false);
          onOpenManager?.();
        }}
        className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        title="Manage profiles"
        aria-label="Manage profiles"
      >
        <Settings size={15} />
      </button>
    </div>
  );
}
