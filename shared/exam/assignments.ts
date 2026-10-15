/**
 * Le regole delle assegnazioni: quando una verifica è aperta, quale prova
 * vede lo studente, quando una prova è scaduta.
 *
 * Modulo PURO, condiviso fra le Functions (che decidono) e la console (che
 * mostra lo stesso stato che il server applica). Le date viaggiano come
 * stringhe ISO, l'istante corrente come millisecondi: niente orologio qui
 * dentro, così le regole si provano con un `now` qualsiasi.
 */

export type TargetType = 'class' | 'student';

/** Stato EFFETTIVO: 'expired' = aperta nel DB, ma il termine per iniziarla è passato. */
export type AssignmentState = 'open' | 'expired' | 'closed';

export interface AssignmentLike {
  id: string;
  status: string;
  open_until: string | null;
  created_at: string;
}

/** Margine dopo la scadenza prima che la consegna la faccia il server. */
export const SERVER_GRACE_MS = 2 * 60_000;

/** Le finestre proposte al docente per iniziare la prova, in minuti. */
export const WINDOW_OPTIONS_MIN = [15, 30, 60, 90, 120, 180, 240, 360, 720] as const;
export const DEFAULT_WINDOW_MIN = 60;
/** Il limite superiore accettato dal server: un giorno. */
export const MAX_WINDOW_MIN = 24 * 60;

export function assignmentState(a: Pick<AssignmentLike, 'status' | 'open_until'>, nowMs: number): AssignmentState {
  if (a.status !== 'open') return 'closed';
  if (a.open_until) {
    const until = Date.parse(a.open_until);
    if (Number.isFinite(until) && until <= nowMs) return 'expired';
  }
  return 'open';
}

/** Lo stato di una prova per l'assegnazione, visto dal punto di vista della scelta. */
export type AttemptStateForPick = 'in_corso' | 'consegnata' | 'annullata';

export interface PickedAssignment<A> {
  assignment: A;
  /** La prova già esistente dello studente per questa assegnazione, se c'è. */
  attempt: AttemptStateForPick | null;
}

/**
 * Fra le assegnazioni APERTE di uno studente, quella da mostrargli.
 *
 * La più recente che non ha ancora svolto; se le ha svolte tutte, la più
 * recente (per mostrargli l'esito invece di «nessuna verifica»). Una prova
 * annullata conta come svolta: per rifarla il docente la elimina.
 */
export function pickAssignment<A extends AssignmentLike>(
  open: readonly A[],
  attempts: ReadonlyMap<string, AttemptStateForPick>,
  nowMs: number
): PickedAssignment<A> | null {
  const usable = open
    .filter((a) => assignmentState(a, nowMs) === 'open')
    .sort((a, b) => (a.created_at < b.created_at ? 1 : a.created_at > b.created_at ? -1 : 0));
  if (usable.length === 0) return null;
  const todo = usable.find((a) => !attempts.has(a.id));
  if (todo) return { assignment: todo, attempt: null };
  const latest = usable[0];
  return { assignment: latest, attempt: attempts.get(latest.id) ?? null };
}

/** Scadenza di una prova: quella salvata, oppure inizio + durata. */
export function attemptDeadlineMs(startedAt: string, durationMin: number, savedDeadline?: string | null): number {
  const saved = savedDeadline ? Date.parse(savedDeadline) : NaN;
  if (Number.isFinite(saved)) return saved;
  return Date.parse(startedAt) + durationMin * 60_000;
}

/** Una prova in corso va chiusa dal server? Solo oltre la scadenza più il margine. */
export function isAbandoned(deadlineMs: number, nowMs: number): boolean {
  return Number.isFinite(deadlineMs) && nowMs > deadlineMs + SERVER_GRACE_MS;
}

/**
 * Il nuovo termine per iniziare: `minutes` da adesso, oppure `null` (aperta
 * finché il docente non la chiude). Valori fuori scala vengono riportati
 * dentro [1, MAX_WINDOW_MIN].
 */
export function windowUntil(minutes: number | null | undefined, nowMs: number): string | null {
  if (minutes === null || minutes === undefined) return null;
  const n = Math.round(Number(minutes));
  if (!Number.isFinite(n)) return null;
  const clamped = Math.max(1, Math.min(MAX_WINDOW_MIN, n));
  return new Date(nowMs + clamped * 60_000).toISOString();
}

/**
 * Prolunga la finestra di `minutes`: dal termine attuale se è ancora nel
 * futuro, altrimenti da adesso. Una finestra senza termine resta tale.
 */
export function extendUntil(current: string | null, minutes: number, nowMs: number): string | null {
  if (!current) return null;
  const base = Math.max(Date.parse(current) || nowMs, nowMs);
  const n = Math.max(1, Math.min(MAX_WINDOW_MIN, Math.round(minutes)));
  return new Date(base + n * 60_000).toISOString();
}

/* ---------------- Distrazioni ---------------- */

/** Un'uscita dalla pagina durante la prova: quando, e per quanti millisecondi. */
export interface FocusEvent {
  at: string;
  ms: number;
}

/** Quante uscite si conservano al massimo per una prova. */
export const MAX_FOCUS_EVENTS = 300;

/** Ripulisce un elenco di uscite arrivato dalla rete o dal DB. */
export function parseFocusEvents(raw: unknown): FocusEvent[] {
  let v = raw;
  if (typeof v === 'string') {
    try {
      v = JSON.parse(v);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(v)) return [];
  const out: FocusEvent[] = [];
  for (const e of v) {
    if (!e || typeof e !== 'object') continue;
    const at = String((e as { at?: unknown }).at ?? '');
    const ms = Math.round(Number((e as { ms?: unknown }).ms));
    if (!Number.isFinite(Date.parse(at)) || !Number.isFinite(ms) || ms < 0) continue;
    out.push({ at: new Date(at).toISOString(), ms: Math.min(ms, 24 * 3600 * 1000) });
    if (out.length >= MAX_FOCUS_EVENTS) break;
  }
  return out;
}
