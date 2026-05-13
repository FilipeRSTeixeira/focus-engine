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
} from "lucide-react";

const DEFAULT_REDIRECT_URI = "http://localhost:3210/api/auth/google/callback";

const LLM_HELP_PROMPT = `Estou a configurar uma aplicação Next.js chamada "Focus Engine" que corre localmente no meu PC e quero ligar à minha conta de Google Calendar. Para isso preciso de criar credenciais OAuth na Google Cloud Console e obter um Client ID e um Client Secret. Guia-me passo a passo, em português de Portugal, assumindo que NÃO sou developer e nunca usei a Google Cloud Console.

Os passos que preciso fazer são:
1. Criar (ou seleccionar) um projecto na Google Cloud Console.
2. Activar a API "Google Calendar API" nesse projecto.
3. Configurar o "OAuth consent screen" em modo "External" e "Testing", e adicionar o meu próprio email como "Test user".
4. Criar credenciais OAuth 2.0 do tipo "Web application", com:
   - Authorized redirect URI = http://localhost:3210/api/auth/google/callback
5. Copiar o Client ID e o Client Secret que aparecem no final.

Diz-me onde clicar em cada passo (nomes dos menus em inglês, porque a consola não está em português) e o que devo escrever em cada campo. Avisa-me se alguma escolha tiver consequências importantes.`;

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
              Definições
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">A carregar…</p>
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
      ? "Tens de configurar as tuas credenciais do Google antes de ligar o Calendar."
      : null
  );
  const [savedFlash, setSavedFlash] = useState(false);

  const [showHelp, setShowHelp] = useState(false);
  const [promptCopied, setPromptCopied] = useState(false);

  useEffect(() => {
    void loadSettings();
    // Handle gcal=connected flash from callback redirect
    if (searchParams?.get("gcal") === "connected") {
      setSavedFlash(true);
      window.setTimeout(() => setSavedFlash(false), 3000);
    }
  }, [searchParams]);

  async function loadSettings() {
    try {
      const res = await fetch("/api/settings/google");
      if (!res.ok) throw new Error(`Falha a carregar (${res.status})`);
      const data: GoogleSettings = await res.json();
      setSettings(data);
      if (data.redirectUri) setRedirectUri(data.redirectUri);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha a carregar definições");
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    if (!clientId.trim() || !clientSecret.trim()) {
      setError("Preenche o Client ID e o Client Secret.");
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
        throw new Error(body.error || `Falha a guardar (${res.status})`);
      }
      setClientId("");
      setClientSecret("");
      setSavedFlash(true);
      window.setTimeout(() => setSavedFlash(false), 3000);
      await loadSettings();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha a guardar");
    } finally {
      setSaving(false);
    }
  }

  async function handleDisconnect() {
    if (!confirm("Desligar o Google Calendar? O token será apagado mas as credenciais ficam.")) return;
    try {
      await fetch("/api/auth/google/disconnect", { method: "POST" });
      await loadSettings();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha a desligar");
    }
  }

  async function handleDeleteCredentials() {
    if (
      !confirm(
        "Apagar credenciais Google? Vais ter de colar Client ID e Client Secret outra vez para usar o Calendar."
      )
    )
      return;
    try {
      await fetch("/api/settings/google", { method: "DELETE" });
      await loadSettings();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha a apagar credenciais");
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
        setError("Não consegui copiar para a área de transferência.");
      });
  }

  return (
    <div className="mx-auto max-w-2xl px-6 pt-20 pb-12 sm:px-10 sm:pt-14">
      <header className="mb-6">
        <h1 className="text-[28px] font-semibold leading-tight tracking-tight sm:text-[32px]">
          Definições
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Configurações desta instalação da Focus Engine.
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
          <span>Guardado.</span>
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
              Cada utilizador tem de criar as suas próprias credenciais OAuth na
              Google Cloud Console e colá-las aqui.
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
                  Desligar Calendar
                </button>
              ) : (
                <a
                  href="/api/auth/google"
                  className="inline-flex items-center gap-1.5 rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90"
                >
                  <Calendar size={12} />
                  Ligar Calendar
                </a>
              )}
              <button
                type="button"
                onClick={handleDeleteCredentials}
                title="Apagar credenciais"
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
                  ? "(deixa em branco para manter o actual)"
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
                  ? "(deixa em branco para manter o actual)"
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
            Avançado
          </button>
          {showAdvanced && (
            <Field
              label="Redirect URI"
              hint="Tem de coincidir EXACTAMENTE com a que registaste na Google Cloud Console."
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
              {saving ? "A guardar…" : "Guardar credenciais"}
            </button>
            {settings?.configured && !settings.connected && (
              <span className="text-xs text-muted-foreground">
                Depois de guardar, carrega em <em>Ligar Calendar</em>.
              </span>
            )}
          </div>
        </form>
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
            Como obter Client ID e Client Secret?
          </span>
          {showHelp ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        {showHelp && (
          <div className="mt-4 space-y-4 text-sm">
            <p className="text-muted-foreground">
              A forma mais rápida: copia o prompt abaixo, cola-o num LLM (ChatGPT,
              Claude, Gemini, etc.) e segue as instruções que ele te der. Demora
              tipicamente 10–15 minutos.
            </p>

            <div className="rounded-lg border border-border bg-muted/30 p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-muted-foreground">
                  Prompt pronto a copiar
                </span>
                <button
                  type="button"
                  onClick={copyPromptToClipboard}
                  className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-xs transition-colors hover:bg-muted"
                >
                  {promptCopied ? (
                    <>
                      <Check size={12} /> Copiado
                    </>
                  ) : (
                    <>
                      <Copy size={12} /> Copiar
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
                Resumo dos passos
              </p>
              <ol className="list-decimal space-y-1.5 pl-5 text-foreground/85">
                <li>
                  Abre a{" "}
                  <a
                    href="https://console.cloud.google.com/"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-0.5 text-primary underline-offset-2 hover:underline"
                  >
                    Google Cloud Console
                    <ExternalLink size={11} />
                  </a>{" "}
                  com a tua conta Google.
                </li>
                <li>Cria um projecto novo (qualquer nome, ex: &quot;Focus Engine&quot;).</li>
                <li>
                  Em <em>APIs &amp; Services → Library</em>, procura{" "}
                  <em>&quot;Google Calendar API&quot;</em> e activa-a.
                </li>
                <li>
                  Em <em>APIs &amp; Services → OAuth consent screen</em>, escolhe{" "}
                  <em>External</em>, deixa em modo <em>Testing</em>, e adiciona o
                  teu email em <em>Test users</em>.
                </li>
                <li>
                  Em <em>APIs &amp; Services → Credentials</em>, cria{" "}
                  <em>OAuth client ID</em> do tipo <em>Web application</em>.
                </li>
                <li>
                  Em <em>Authorized redirect URIs</em>, cola exactamente:
                  <code className="ml-1 inline-block rounded bg-muted px-1.5 py-0.5 font-mono text-[11px]">
                    {DEFAULT_REDIRECT_URI}
                  </code>
                </li>
                <li>
                  Copia o <em>Client ID</em> e o <em>Client Secret</em> e cola-os
                  no formulário acima.
                </li>
              </ol>
            </div>

            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300">
              <strong className="block mb-1">Notas:</strong>
              <ul className="list-disc space-y-1 pl-4">
                <li>
                  Mantém o ecrã de consentimento em <em>Testing</em> — não
                  precisas de submeter a verificação Google enquanto fores só tu
                  (e até 100 utilizadores adicionados manualmente).
                </li>
                <li>
                  Se mudares a porta do servidor (não 3210), tens de actualizar o
                  Redirect URI aqui <strong>e</strong> na Google Cloud Console.
                </li>
                <li>
                  O Client Secret nunca sai do teu PC — fica guardado no SQLite
                  desta instalação.
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
        <Check size={11} /> Ligado
      </span>
    );
  }
  if (settings.configured) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-xs text-amber-600 dark:text-amber-400">
        Credenciais OK · Por ligar
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
      Não configurado
    </span>
  );
}
