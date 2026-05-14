/**
 * Procedural sound design.
 *
 * Instead of shipping audio files, we synthesise three short cues with the
 * Web Audio API so they ship with the bundle and adapt to the user's volume
 * preference. Each cue is multi-layered (carrier + harmonic + envelope) so it
 * sounds richer than a raw oscillator beep.
 *
 *   • tink   — work session completed, task ticked off (bright, short)
 *   • chime  — break finished, ready to refocus (warm, two-note)
 *   • huff   — focus lost / reset (downward, soft)
 *
 * All cues respect:
 *   • A persisted `soundEnabled` flag (default: true)
 *   • A persisted `soundVolume` from 0..1 (default: 0.6)
 *   • `prefers-reduced-motion` is NOT used to silence audio — that's a
 *     separate axis. Use the explicit Setting.
 */

const LS_ENABLED = "focus-engine-sound-enabled";
const LS_VOLUME = "focus-engine-sound-volume";

/* --------------------------- Preference helpers --------------------------- */

export function getSoundEnabled(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const v = window.localStorage.getItem(LS_ENABLED);
    if (v === null) return true;
    return v === "true";
  } catch {
    return true;
  }
}

export function setSoundEnabled(value: boolean) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LS_ENABLED, String(value));
  } catch {
    /* ignore */
  }
}

export function getSoundVolume(): number {
  if (typeof window === "undefined") return 0.6;
  try {
    const v = window.localStorage.getItem(LS_VOLUME);
    if (v === null) return 0.6;
    const n = Number.parseFloat(v);
    if (Number.isFinite(n)) return Math.max(0, Math.min(1, n));
    return 0.6;
  } catch {
    return 0.6;
  }
}

export function setSoundVolume(value: number) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      LS_VOLUME,
      String(Math.max(0, Math.min(1, value)))
    );
  } catch {
    /* ignore */
  }
}

/* ----------------------------- Audio context ------------------------------ */

let ctxRef: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (ctxRef && ctxRef.state !== "closed") return ctxRef;
  const AC =
    window.AudioContext ||
    (window as Window & { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!AC) return null;
  try {
    ctxRef = new AC();
  } catch {
    return null;
  }
  return ctxRef;
}

/* ----------------------------- Tone primitive ----------------------------- */

type Tone = {
  freq: number;
  start: number; // seconds offset from now
  duration: number; // seconds
  type?: OscillatorType;
  /** Peak gain before applying the user's master volume (0..1) */
  peak?: number;
  /** Optional detune in cents */
  detune?: number;
  /** Lowpass cutoff in Hz; omit to skip filtering */
  filter?: number;
};

function playTones(tones: Tone[]) {
  if (!getSoundEnabled()) return;
  const ctx = getCtx();
  if (!ctx) return;

  // Some browsers start AudioContext in "suspended" state until the user
  // interacts. Resume best-effort; if it fails we just skip the cue.
  if (ctx.state === "suspended") {
    ctx.resume().catch(() => {
      /* ignore */
    });
  }

  const master = ctx.createGain();
  master.gain.value = getSoundVolume();
  master.connect(ctx.destination);

  const now = ctx.currentTime;
  for (const t of tones) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = t.type ?? "sine";
    osc.frequency.value = t.freq;
    if (t.detune) osc.detune.value = t.detune;

    const peak = t.peak ?? 0.4;
    const start = now + t.start;
    const end = start + t.duration;

    // ADSR-ish envelope: 8ms attack, exp decay to silence.
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(peak, start + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, end);

    let node: AudioNode = osc;
    if (t.filter) {
      const lp = ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = t.filter;
      osc.connect(lp);
      node = lp;
    }

    node.connect(gain);
    gain.connect(master);

    osc.start(start);
    osc.stop(end + 0.02);
  }
}

/* --------------------------------- Cues ----------------------------------- */

/** Short, bright "tink" — task ticked, work session ended. */
export function playTink() {
  playTones([
    { freq: 1320, start: 0, duration: 0.18, type: "sine", peak: 0.35 },
    {
      freq: 1980,
      start: 0,
      duration: 0.14,
      type: "sine",
      peak: 0.18,
      filter: 4000,
    },
  ]);
  haptic([8]);
}

/** Warm two-note ascending chime — break done, ready to refocus. */
export function playChime() {
  playTones([
    { freq: 660, start: 0, duration: 0.22, type: "sine", peak: 0.32 },
    { freq: 990, start: 0.12, duration: 0.32, type: "sine", peak: 0.28 },
    {
      freq: 1320,
      start: 0.12,
      duration: 0.24,
      type: "sine",
      peak: 0.14,
      filter: 3500,
    },
  ]);
  haptic([10, 40, 10]);
}

/** Soft descending "huff" — focus lost or reset. */
export function playHuff() {
  playTones([
    { freq: 520, start: 0, duration: 0.18, type: "sine", peak: 0.3 },
    { freq: 360, start: 0.08, duration: 0.22, type: "sine", peak: 0.25 },
  ]);
  haptic([5]);
}

/* ------------------------------- Haptics --------------------------------- */

/**
 * Best-effort vibration. Silently no-ops on desktop or when the user has
 * sound disabled (treated as a single user-facing "feedback" preference).
 */
export function haptic(pattern: number | number[]) {
  if (!getSoundEnabled()) return;
  if (typeof navigator === "undefined") return;
  if (typeof navigator.vibrate !== "function") return;
  try {
    navigator.vibrate(pattern);
  } catch {
    /* ignore */
  }
}
