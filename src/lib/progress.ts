/**
 * Progressi della palestra: XP, livelli, serie (streak), statistiche per
 * argomento e traguardi (badge).
 *
 * Modello IBRIDO: sempre su localStorage (funziona senza login e offline);
 * se l'utente è autenticato viene sincronizzato su D1 (vedi lib/sync.ts).
 */

import { MODULES, type ModuleKey } from '../../shared/exercises/generator';

const KEY = 'bc_progress_v1';

export interface ModuleStat {
  attempts: number;
  correct: number;
}

export interface Progress {
  xp: number;
  streak: number;
  bestStreak: number;
  byModule: Record<ModuleKey, ModuleStat>;
  badges: string[];
  updatedAt: string;
}

export function emptyProgress(): Progress {
  const byModule = {} as Record<ModuleKey, ModuleStat>;
  for (const m of MODULES) byModule[m] = { attempts: 0, correct: 0 };
  return { xp: 0, streak: 0, bestStreak: 0, byModule, badges: [], updatedAt: new Date().toISOString() };
}

/** Totali aggregati. */
export function totals(p: Progress): { attempts: number; correct: number; accuracy: number } {
  let attempts = 0;
  let correct = 0;
  for (const m of MODULES) {
    attempts += p.byModule[m]?.attempts ?? 0;
    correct += p.byModule[m]?.correct ?? 0;
  }
  return { attempts, correct, accuracy: attempts ? correct / attempts : 0 };
}

/* ---------------- Livelli ---------------- */

/** XP cumulativi necessari per raggiungere il livello n (n >= 1). */
export function xpForLevel(n: number): number {
  return (100 * (n - 1) * n) / 2;
}

export function levelFromXp(xp: number): number {
  let n = 1;
  while (xpForLevel(n + 1) <= xp) n++;
  return n;
}

export interface LevelInfo {
  level: number;
  xpInLevel: number;
  xpForNext: number;
  progress: number; // 0..1
}

export function levelInfo(xp: number): LevelInfo {
  const level = levelFromXp(xp);
  const base = xpForLevel(level);
  const next = xpForLevel(level + 1);
  const span = next - base;
  return {
    level,
    xpInLevel: xp - base,
    xpForNext: next - xp,
    progress: span > 0 ? (xp - base) / span : 0,
  };
}

/* ---------------- Badge ---------------- */

export interface BadgeDef {
  id: string;
  nameKey: string;
  descKey: string;
  /** Icona lucide (nome). */
  icon: string;
  earned: (p: Progress) => boolean;
}

export const BADGES: BadgeDef[] = [
  { id: 'firstStep', nameKey: 'badges.firstStep', descKey: 'badges.firstStepDesc', icon: 'Sparkles', earned: (p) => totals(p).correct >= 1 },
  { id: 'ten', nameKey: 'badges.ten', descKey: 'badges.tenDesc', icon: 'Cog', earned: (p) => totals(p).correct >= 10 },
  { id: 'fifty', nameKey: 'badges.fifty', descKey: 'badges.fiftyDesc', icon: 'Settings', earned: (p) => totals(p).correct >= 50 },
  { id: 'hundred', nameKey: 'badges.hundred', descKey: 'badges.hundredDesc', icon: 'Crown', earned: (p) => totals(p).correct >= 100 },
  { id: 'streak5', nameKey: 'badges.streak5', descKey: 'badges.streak5Desc', icon: 'Flame', earned: (p) => p.bestStreak >= 5 },
  { id: 'streak10', nameKey: 'badges.streak10', descKey: 'badges.streak10Desc', icon: 'Zap', earned: (p) => p.bestStreak >= 10 },
  { id: 'streak25', nameKey: 'badges.streak25', descKey: 'badges.streak25Desc', icon: 'Trophy', earned: (p) => p.bestStreak >= 25 },
  {
    id: 'polyglot',
    nameKey: 'badges.polyglot',
    descKey: 'badges.polyglotDesc',
    icon: 'Globe',
    earned: (p) => MODULES.every((m) => (p.byModule[m]?.correct ?? 0) >= 1),
  },
  { id: 'converterPro', nameKey: 'badges.converterPro', descKey: 'badges.converterProDesc', icon: 'Binary', earned: (p) => (p.byModule.converter?.correct ?? 0) >= 20 },
  { id: 'arithmeticPro', nameKey: 'badges.arithmeticPro', descKey: 'badges.arithmeticProDesc', icon: 'Calculator', earned: (p) => (p.byModule.arithmetic?.correct ?? 0) >= 20 },
  { id: 'signedPro', nameKey: 'badges.signedPro', descKey: 'badges.signedProDesc', icon: 'Diff', earned: (p) => (p.byModule.signed?.correct ?? 0) >= 20 },
  { id: 'ieeePro', nameKey: 'badges.ieeePro', descKey: 'badges.ieeeProDesc', icon: 'Sigma', earned: (p) => (p.byModule.ieee?.correct ?? 0) >= 20 },
  { id: 'textPro', nameKey: 'badges.textPro', descKey: 'badges.textProDesc', icon: 'Type', earned: (p) => (p.byModule.text?.correct ?? 0) >= 20 },
  { id: 'level5', nameKey: 'badges.level5', descKey: 'badges.level5Desc', icon: 'Star', earned: (p) => levelFromXp(p.xp) >= 5 },
  { id: 'level10', nameKey: 'badges.level10', descKey: 'badges.level10Desc', icon: 'Award', earned: (p) => levelFromXp(p.xp) >= 10 },
  {
    id: 'accuracy90',
    nameKey: 'badges.accuracy90',
    descKey: 'badges.accuracy90Desc',
    icon: 'Target',
    earned: (p) => {
      const tt = totals(p);
      return tt.attempts >= 30 && tt.correct / tt.attempts >= 0.9;
    },
  },
];

/** Ricalcola i badge, restituendo quelli NUOVI rispetto a `p.badges`. */
export function evaluateBadges(p: Progress): string[] {
  const earned = BADGES.filter((b) => b.earned(p)).map((b) => b.id);
  return earned.filter((id) => !p.badges.includes(id));
}

/* ---------------- Registrazione di un tentativo ---------------- */

export interface AttemptOutcome {
  progress: Progress;
  /** Badge sbloccati con questo tentativo. */
  newBadges: string[];
  xpGained: number;
}

/** XP guadagnati: punti dell'esercizio × 10, con bonus serie. */
export function xpFor(points: number, streak: number): number {
  const bonus = streak >= 10 ? 2 : streak >= 5 ? 1.5 : 1;
  return Math.round(points * 10 * bonus);
}

/** Registra un tentativo e aggiorna XP, serie, statistiche e badge. */
export function recordAttempt(prev: Progress, module: ModuleKey, correct: boolean, points: number): AttemptOutcome {
  const p: Progress = {
    ...prev,
    byModule: { ...prev.byModule, [module]: { ...(prev.byModule[module] ?? { attempts: 0, correct: 0 }) } },
    badges: [...prev.badges],
  };
  const stat = p.byModule[module];
  stat.attempts += 1;

  let xpGained = 0;
  if (correct) {
    stat.correct += 1;
    p.streak = prev.streak + 1;
    p.bestStreak = Math.max(prev.bestStreak, p.streak);
    xpGained = xpFor(points, p.streak);
    p.xp = prev.xp + xpGained;
  } else {
    p.streak = 0;
  }
  p.updatedAt = new Date().toISOString();

  const newBadges = evaluateBadges(p);
  p.badges = [...p.badges, ...newBadges];
  return { progress: p, newBadges, xpGained };
}

/* ---------------- Persistenza locale ---------------- */

/**
 * Normalizza un oggetto Progress arbitrario (da localStorage o dal server)
 * riempiendo i campi mancanti. Usato sia dallo studente sia dalla console
 * docente, così la matematica di livello/precisione è identica per entrambi.
 */
export function coerceProgress(raw: unknown): Progress {
  const parsed = (typeof raw === 'object' && raw !== null ? raw : {}) as Partial<Progress>;
  const base = emptyProgress();
  return {
    ...base,
    ...parsed,
    byModule: { ...base.byModule, ...(parsed.byModule ?? {}) },
    badges: Array.isArray(parsed.badges) ? parsed.badges : [],
  };
}

export function loadProgress(): Progress {
  if (typeof localStorage === 'undefined') return emptyProgress();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return emptyProgress();
    return coerceProgress(JSON.parse(raw));
  } catch {
    return emptyProgress();
  }
}

export function saveProgress(p: Progress): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    // quota piena o storage disabilitato: i progressi restano solo in memoria
  }
}

/** Fonde due progressi (locale + server) prendendo il massimo di ogni metrica. */
export function mergeProgress(a: Progress, b: Progress): Progress {
  const byModule = {} as Record<ModuleKey, ModuleStat>;
  for (const m of MODULES) {
    const am = a.byModule[m] ?? { attempts: 0, correct: 0 };
    const bm = b.byModule[m] ?? { attempts: 0, correct: 0 };
    byModule[m] = { attempts: Math.max(am.attempts, bm.attempts), correct: Math.max(am.correct, bm.correct) };
  }
  return {
    xp: Math.max(a.xp, b.xp),
    streak: Math.max(a.streak, b.streak),
    bestStreak: Math.max(a.bestStreak, b.bestStreak),
    byModule,
    badges: Array.from(new Set([...a.badges, ...b.badges])),
    updatedAt: new Date().toISOString(),
  };
}
