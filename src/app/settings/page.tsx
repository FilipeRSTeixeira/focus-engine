"use client";

import { Suspense, useEffect, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import {
  Calendar,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  ExternalLink,
  HelpCircle,
  KeyRound,
  Trash2,
  AlertTriangle,
  Volume2,
  VolumeX,
} from "lucide-react";
import {
  getSoundEnabled,
  getSoundVolume,
  setSoundEnabled,
  setSoundVolume,
  playTink,
} from "@/lib/sound";

const DEFAULT_REDIRECT_URI = "http://localhost:3210/api/auth/google/callback";

const LLM_HELP_PROMPT = `I'm setting up a Next.js app called "Focus Engine" that runs locally on my PC and I want to connect it to my Google Calendar account. To do this I need to create OAuth credentials in the Google Cloud Console and obtain a Client ID and a Client Secret. Guide me step by step, assuming I am NOT a developer and have never used the Google Cloud Console.

The steps I need to follow are:
1. Create (or select) a project in the Google Cloud Console.
2. Enable the "Google Calendar API" in that project.
3. Configure the "OAuth consent screen" in "External" and "Testing" mode, and add my own email as a "Test user".
4. Create OAuth 2.0 credentials of type "Web application", with:
   - Authorized redirect URI = http://localhost:3210/api/auth/google/callback
5. Copy the Client ID and Client Secret shown at the end.

Tell me where to click at each step (menu names are in English because the console is not localised) and what to type in each field. Warn me if any choice has important consequences.`;

type GoogleSettings = {
  configured: boolean;
  clientIdMasked: string | null;
  hasSecret: boolean;
  redirectUri: string;
  connected: boolean;
};

export default function SettingsPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-2xl px-6 pt-20 pb-12 sm:px-10 sm:pt-14" aria-busy="true">
          <header className="mb-6">
            <h1 className="text-[28px] font-semibold leading-tight tracking-tight sm:text-[32px]">
              Settings
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">Loading…</p>
          </header>
        </div>
      }
    >
      <SettingsContent />
    </Suspense>
  );
}

function SettingsContent() {
  const searchParams = useSearchParams();
  const initialError = searchParams?.get("error");

  const [settings, setSettings] = useState<GoogleSettings | null>(null);
  const [loading, setLoading] = useState(true);

  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [redirectUri, setRedirectUri] = useState(DEFAULT_REDIRECT_URI);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(
    initialError === "missing_credentials"
      ? "You need to configure your Google credentials before connecting the Calendar."
      : null
  );
  const [savedFlash, setSavedFlash] = useState(false);

  const [showHelp, setShowHelp] = useState(false);
  const [promptCopied, setPromptCopied] = useState(false);

  // Sound & feedback preferences (persisted to localStorage by @/lib/sound).
  const [soundOn, setSoundOn] = useState(true);
  const [volume, setVolume] = useState(0.6);

  useEffect(() => {
    void loadSettings();
    if (searchParams?.get("gcal") === "connected") {
      setSavedFlash(true);
      window.setTimeout(() => setSavedFlash(false), 3000);
    }
    setSoundOn(getSoundEnabled());
    setVolume(getSoundVolume());
  }, [searchParams]);

  function handleToggleSound(next: boolean) {
    setSoundOn(next);
    setSoundEnabled(next);
    if (next) playTink();
  }

  function handleVolumeChange(next: number) {
    setVolume(next);
    setSoundVolume(next);
  }

  function previewSound() {
    playTink();
  }

  async function loadSettings() {
    try {
      const res = await fetch("/api/settings/google");
      if (!res.ok) throw new Error(`Failed to load (${res.status})`);
      const data: GoogleSettings = await res.json();
      setSettings(data);
      if (data.redirectUri) setRedirectUri(data.redirectUri);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load settings");
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    if (!clientId.trim() || !clientSecret.trim()) {
      setError("Please fill in both the Client ID and Client Secret.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/settings/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: clientId.trim(),
          clientSecret: clientSecret.trim(),
          redirectUri: redirectUri.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Failed to save (${res.status})`);
      }
      setClientId("");
      setClientSecret("");
      setSavedFlash(true);
      window.setTimeout(() => setSavedFlash(false), 3000);
      await loadSettings();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function handleDisconnect() {
    if (!confirm("Disconnect Google Calendar? The token will be deleted but credentials will remain.")) return;
    try {
      await fetch("/api/auth/google/disconnect", { method: "POST" });
      await loadSettings();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to disconnect");
    }
  }

  async function handleDeleteCredentials() {
    if (
      !confirm(
        "Delete Google credentials? You will need to paste the Client ID and Client Secret again to use the Calendar."
      )
    )
      return;
    try {
      await fetch("/api/settings/google", { method: "DELETE" });
      await loadSettings();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete credentials");
    }
  }

  function copyPromptToClipboard() {
    navigator.clipboard
      .writeText(LLM_HELP_PROMPT)
      .then(() => {
        setPromptCopied(true);
        window.setTimeout(() => setPromptCopied(false), 2000);
      })
      .catch(() => {
        setError("Could not copy to clipboard.");
      });
  }

  return (
    <div className="mx-auto max-w-2xl px-6 pt-20 pb-12 sm:px-10 sm:pt-14">
      <header className="mb-6">
        <h1 className="text-[28px] font-semibold leading-tight tracking-tight sm:text-[32px]">
          Settings
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Configuration for this Focus Engine installation.
        </p>
      </header>

      {error && (
        <div className="mb-4 flex items-start gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {savedFlash && (
        <div className="mb-4 flex items-center gap-2 rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-600 dark:text-emerald-400">
          <Check size={16} />
          <span>Saved.</span>
        </div>
      )}

      {/* Google Calendar section */}
      <section className="mb-6 rounded-2xl bg-card p-5 shadow-card">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-base font-semibold">
              <Calendar size={18} style={{ color: "#3478F6" }} />
              Google Calendar
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Each user must create their own OAuth credentials in the
              Google Cloud Console and paste them here.
            </p>
          </div>
          <StatusBadge settings={settings} loading={loading} />
        </div>

        {/* Connect / disconnect actions when credentials are present */}
        {settings?.configured && (
          <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg bg-muted/40 px-3 py-2 text-sm">
            <KeyRound size={14} className="text-muted-foreground" />
            <span className="text-muted-foreground">Client ID:</span>
            <code className="font-mono text-xs">{settings.clientIdMasked}</code>
            <div className="ml-auto flex flex-wrap items-center gap-2">
              {settings.connected ? (
                <button
                  type="button"
                  onClick={handleDisconnect}
                  className="rounded-md border border-border bg-background px-2.5 py-1 text-xs font-medium transition-colors hover:bg-muted"
                >
                  Disconnect Calendar
                </button>
              ) : (
                <a
                  href="/api/auth/google"
                  className="inline-flex items-center gap-1.5 rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90"
                >
                  <Calendar size={12} />
                  Connect Calendar
                </a>
              )}
              <button
                type="button"
                onClick={handleDeleteCredentials}
                title="Delete credentials"
                className="rounded-md border border-border bg-background p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 size={12} />
              </button>
            </div>
          </div>
        )}

        {/* Credentials form */}
        <form onSubmit={handleSave} className="flex flex-col gap-3">
          <Field label="Client ID">
            <input
              type="text"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              placeholder={
                settings?.configured
                  ? "(leave blank to keep current)"
                  : "1234567890-abc...apps.googleusercontent.com"
              }
              className="w-full rounded-md border border-border bg-background px-3 py-2 font-mono text-xs focus:border-primary focus:outline-none"
            />
          </Field>
          <Field label="Client Secret">
            <input
              type="password"
              value={clientSecret}
              onChange={(e) => setClientSecret(e.target.value)}
              placeholder={
                settings?.hasSecret
                  ? "(leave blank to keep current)"
                  : "GOCSPX-..."
              }
              className="w-full rounded-md border border-border bg-background px-3 py-2 font-mono text-xs focus:border-primary focus:outline-none"
            />
          </Field>

          <button
            type="button"
            onClick={() => setShowAdvanced((v) => !v)}
            className="inline-flex items-center gap-1 self-start text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            {showAdvanced ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            Advanced
          </button>
          {showAdvanced && (
            <Field
              label="Redirect URI"
              hint="Must match EXACTLY what you registered in the Google Cloud Console."
            >
              <input
                type="text"
                value={redirectUri}
                onChange={(e) => setRedirectUri(e.target.value)}
                placeholder={DEFAULT_REDIRECT_URI}
                className="w-full rounded-md border border-border bg-background px-3 py-2 font-mono text-xs focus:border-primary focus:outline-none"
              />
            </Field>
          )}

          <div className="mt-1 flex items-center gap-2">
            <button
              type="submit"
              disabled={saving || (!clientId.trim() && !clientSecret.trim())}
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save credentials"}
            </button>
            {settings?.configured && !settings.connected && (
              <span className="text-xs text-muted-foreground">
                After saving, click <em>Connect Calendar</em>.
              </span>
            )}
          </div>
        </form>
      </section>

      {/* Sound & feedback section */}
      <section className="mb-6 rounded-2xl bg-card p-5 shadow-card">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-base font-semibold">
              {soundOn ? (
                <Volume2 size={18} style={{ color: "#34C759" }} />
              ) : (
                <VolumeX size={18} className="text-muted-foreground" />
              )}
              Sound &amp; feedback
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Subtle cues on task completion, focus transitions, and reward
              activation. Vibration is used on supporting devices.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <label className="flex items-center justify-between gap-3 rounded-lg bg-muted/40 px-3 py-2.5 text-sm">
            <span>Play sounds</span>
            <button
              type="button"
              role="switch"
              aria-checked={soundOn}
              onClick={() => handleToggleSound(!soundOn)}
              className={`relative h-6 w-10 rounded-full transition-colors ${
                soundOn ? "bg-primary" : "bg-muted"
              }`}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-background shadow transition-transform ${
                  soundOn ? "translate-x-4" : "translate-x-0.5"
                }`}
              />
            </button>
          </label>

          <div className="rounded-lg bg-muted/40 px-3 py-2.5">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span>Volume</span>
              <span className="text-xs tabular-nums text-muted-foreground">
                {Math.round(volume * 100)}%
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={volume}
              disabled={!soundOn}
              onChange={(e) => handleVolumeChange(Number(e.target.value))}
              className="w-full accent-primary disabled:opacity-50"
              aria-label="Sound volume"
            />
          </div>

          <button
            type="button"
            onClick={previewSound}
            disabled={!soundOn}
            className="self-start rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium transition-colors hover:bg-muted disabled:opacity-50"
          >
            Play sample
          </button>
        </div>
      </section>

      {/* Help section */}
      <section className="rounded-2xl bg-card p-5 shadow-card">
        <button
          type="button"
          onClick={() => setShowHelp((v) => !v)}
          className="flex w-full items-center justify-between gap-2 text-left"
        >
          <span className="flex items-center gap-2 text-base font-semibold">
            <HelpCircle size={18} className="text-muted-foreground" />
            How to get a Client ID and Client Secret?
          </span>
          {showHelp ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        {showHelp && (
          <div className="mt-4 space-y-4 text-sm">
            <p className="text-muted-foreground">
              The fastest way: copy the prompt below, paste it into an LLM (ChatGPT,
              Claude, Gemini, etc.) and follow the instructions it gives you. It
              typically takes 10–15 minutes.
            </p>

            <div className="rounded-lg border border-border bg-muted/30 p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-muted-foreground">
                  Ready-to-copy prompt
                </span>
                <button
                  type="button"
                  onClick={copyPromptToClipboard}
                  className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-xs transition-colors hover:bg-muted"
                >
                  {promptCopied ? (
                    <>
                      <Check size={12} /> Copied
                    </>
                  ) : (
                    <>
                      <Copy size={12} /> Copy
                    </>
                  )}
                </button>
              </div>
              <pre className="max-h-56 overflow-auto whitespace-pre-wrap break-words text-xs leading-relaxed text-foreground/80">
                {LLM_HELP_PROMPT}
              </pre>
            </div>

            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Steps summary
              </p>
              <ol className="list-decimal space-y-1.5 pl-5 text-foreground/85">
                <li>
                  Open the{" "}
                  <a
                    href="https://console.cloud.google.com/"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-0.5 text-primary underline-offset-2 hover:underline"
                  >
                    Google Cloud Console
                    <ExternalLink size={11} />
                  </a>{" "}
                  with your Google account.
                </li>
                <li>Create a new project (any name, e.g. &quot;Focus Engine&quot;).</li>
                <li>
                  Under <em>APIs &amp; Services → Library</em>, search for{" "}
                  <em>&quot;Google Calendar API&quot;</em> and enable it.
                </li>
                <li>
                  Under <em>APIs &amp; Services → OAuth consent screen</em>, choose{" "}
                  <em>External</em>, keep it in <em>Testing</em> mode, and add your
                  email under <em>Test users</em>.
                </li>
                <li>
                  Under <em>APIs &amp; Services → Credentials</em>, create an{" "}
                  <em>OAuth client ID</em> of type <em>Web application</em>.
                </li>
                <li>
                  Under <em>Authorized redirect URIs</em>, paste exactly:
                  <code className="ml-1 inline-block rounded bg-muted px-1.5 py-0.5 font-mono text-[11px]">
                    {DEFAULT_REDIRECT_URI}
                  </code>
                </li>
                <li>
                  Copy the <em>Client ID</em> and <em>Client Secret</em> and paste
                  them in the form above.
                </li>
              </ol>
            </div>

            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300">
              <strong className="block mb-1">Notes:</strong>
              <ul className="list-disc space-y-1 pl-4">
                <li>
                  Keep the consent screen in <em>Testing</em> mode — you don&apos;t
                  need to submit for Google verification as long as it is just you
                  (and up to 100 manually added users).
                </li>
                <li>
                  If you change the server port (not 3210), you must update the
                  Redirect URI here <strong>and</strong> in the Google Cloud Console.
                </li>
                <li>
                  The Client Secret never leaves your PC — it is stored in the
                  SQLite database of this installation.
                </li>
              </ul>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                              Subcomponents                                 */
/* -------------------------------------------------------------------------- */

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
      {hint && <span className="text-[11px] text-muted-foreground/80">{hint}</span>}
    </label>
  );
}

function StatusBadge({
  settings,
  loading,
}: {
  settings: GoogleSettings | null;
  loading: boolean;
}) {
  if (loading || !settings) {
    return (
      <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
        …
      </span>
    );
  }
  if (settings.connected) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-600 dark:text-emerald-400">
        <Check size={11} /> Connected
      </span>
    );
  }
  if (settings.configured) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-xs text-amber-600 dark:text-amber-400">
        Credentials OK · Not connected
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
      Not configured
    </span>
  );
}
