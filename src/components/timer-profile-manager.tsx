"use client";

import { useState, useEffect, useCallback } from "react";
import { X, Plus, Check, Trash2, Play, Pencil } from "lucide-react";

type TimerProfile = {
  id: number;
  name: string;
  workMinutes: number;
  breakMinutes: number;
  isActive: boolean;
  isDefault: boolean;
};

export function TimerProfileManager({
  open,
  onClose,
  onProfileChange,
}: {
  open: boolean;
  onClose: () => void;
  onProfileChange: (profile: TimerProfile) => void;
}) {
  const [profiles, setProfiles] = useState<TimerProfile[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editWork, setEditWork] = useState(25);
  const [editBreak, setEditBreak] = useState(5);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newWork, setNewWork] = useState(25);
  const [newBreak, setNewBreak] = useState(5);
  const [error, setError] = useState("");

  const loadProfiles = useCallback(async () => {
    try {
      const res = await fetch("/api/timer-profiles");
      const data = await res.json();
      setProfiles(data.profiles);
    } catch {
      setProfiles([]);
    }
    setError("");
  }, []);

  useEffect(() => {
    if (open) {
      loadProfiles();
      setCreating(false);
      setEditingId(null);
    }
  }, [open, loadProfiles]);

  async function handleActivate(id: number) {
    try {
      const res = await fetch(`/api/timer-profiles/${id}/activate`, {
        method: "POST",
      });
      if (res.ok) {
        const data = await res.json();
        onProfileChange(data.profile);
        await loadProfiles();
      }
    } catch {
      setError("Failed to activate profile");
    }
  }

  async function handleDelete(id: number) {
    try {
      const res = await fetch(`/api/timer-profiles/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        await loadProfiles();
      } else {
        const data = await res.json();
        setError(data.error);
      }
    } catch {
      setError("Failed to delete profile");
    }
  }

  async function handleSaveEdit(id: number) {
    if (!editName.trim()) {
      setError("Name is required");
      return;
    }
    try {
      const res = await fetch(`/api/timer-profiles/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName.trim(),
          workMinutes: editWork,
          breakMinutes: editBreak,
        }),
      });
      if (res.ok) {
        await loadProfiles();
        setEditingId(null);
      } else {
        const data = await res.json();
        setError(data.error);
      }
    } catch {
      setError("Failed to update profile");
    }
  }

  async function handleCreate() {
    if (!newName.trim()) {
      setError("Name is required");
      return;
    }
    try {
      const res = await fetch("/api/timer-profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName.trim(),
          workMinutes: newWork,
          breakMinutes: newBreak,
          isActive: false,
        }),
      });
      if (res.ok) {
        setNewName("");
        setNewWork(25);
        setNewBreak(5);
        setCreating(false);
        await loadProfiles();
      } else {
        const data = await res.json();
        setError(data.error);
      }
    } catch {
      setError("Failed to create profile");
    }
  }

  function startEdit(p: TimerProfile) {
    setEditingId(p.id);
    setEditName(p.name);
    setEditWork(p.workMinutes);
    setEditBreak(p.breakMinutes);
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-popover p-5 shadow-popover sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold tracking-tight">
            Timer Profiles
          </h3>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X size={17} />
          </button>
        </div>

        {error && (
          <div className="mb-3 rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {error}
          </div>
        )}

        <ul className="mb-4 flex flex-col">
          {profiles.map((p) => (
            <li
              key={p.id}
              className={`group/profile rounded-lg px-2 transition-colors ${
                p.isActive
                  ? "bg-muted"
                  : editingId === p.id
                  ? "bg-muted/60"
                  : "hover:bg-muted/40"
              }`}
            >
              {editingId === p.id ? (
                <div className="flex flex-col gap-2 py-2.5 sm:flex-row sm:items-center">
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="flex-1 rounded-md bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring/40"
                    autoFocus
                  />
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      value={editWork}
                      onChange={(e) => setEditWork(Number(e.target.value))}
                      className="w-16 rounded-md bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring/40"
                      min={1}
                    />
                    <span className="text-xs text-muted-foreground">/</span>
                    <input
                      type="number"
                      value={editBreak}
                      onChange={(e) => setEditBreak(Number(e.target.value))}
                      className="w-16 rounded-md bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring/40"
                      min={1}
                    />
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleSaveEdit(p.id)}
                      className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground hover:opacity-90"
                      title="Save"
                    >
                      <Check size={14} />
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                      title="Cancel"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 py-2.5">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{p.name}</span>
                      {p.isActive && (
                        <span
                          className="rounded-full bg-background px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider"
                          style={{ color: "#3478F6" }}
                        >
                          active
                        </span>
                      )}
                      {p.isDefault && (
                        <span className="rounded-full bg-background px-1.5 py-0.5 text-[10px] text-muted-foreground">
                          default
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-muted-foreground">
                      {p.workMinutes} min focus · {p.breakMinutes} min break
                    </span>
                  </div>
                  <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover/profile:opacity-100">
                    {!p.isActive && (
                      <button
                        onClick={() => handleActivate(p.id)}
                        className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-background hover:text-foreground"
                        title="Activate"
                      >
                        <Play size={13} />
                      </button>
                    )}
                    {!p.isDefault && (
                      <button
                        onClick={() => startEdit(p)}
                        className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-background hover:text-foreground"
                        title="Edit"
                      >
                        <Pencil size={13} />
                      </button>
                    )}
                    {!p.isDefault && (
                      <button
                        onClick={() => handleDelete(p.id)}
                        className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:cursor-not-allowed disabled:opacity-30"
                        title="Delete"
                        disabled={p.isActive}
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>

        {creating ? (
          <div className="flex flex-col gap-2 rounded-lg bg-muted/40 p-3">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Profile name"
              className="w-full rounded-md bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/40"
              autoFocus
            />
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  value={newWork}
                  onChange={(e) => setNewWork(Number(e.target.value))}
                  className="w-16 rounded-md bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring/40"
                  min={1}
                />
                <span className="text-xs text-muted-foreground">focus</span>
              </div>
              <span className="text-xs text-muted-foreground">/</span>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  value={newBreak}
                  onChange={(e) => setNewBreak(Number(e.target.value))}
                  className="w-16 rounded-md bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring/40"
                  min={1}
                />
                <span className="text-xs text-muted-foreground">break</span>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleCreate}
                className="flex-1 rounded-md bg-primary py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
              >
                Create
              </button>
              <button
                onClick={() => {
                  setCreating(false);
                  setNewName("");
                }}
                className="flex-1 rounded-md bg-background py-2 text-sm text