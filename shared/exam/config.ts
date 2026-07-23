/**
 * Configurazione e correzione delle verifiche ufficiali.
 *
 * Condiviso client/server. La CORREZIONE VERA avviene solo lato server
 * (functions/api/exam/submit.ts): il client non conosce mai le risposte
 * attese prima della consegna.
 *
 * Scala di voto: identica a CCNA1/VLSM — lineare sulla percentuale,
 * arrotondata a 0,25, confinata in [0, 10]; sufficienza al 60% → 6,0.
 */

import {
  MODULES,
  type Constraints,
  type Difficulty,
  type ModuleKey,
  generateSet,
  checkAnswer,
  type Exercise,
} from '../exercises/generator';
import type { ExamSpec } from './catalog';

export interface ExamConfig {
  durationMin: number;
  questionCount: number;
  modules: ModuleKey[];
  difficulty: Difficulty;
  /**
   * Restrizioni sull'argomento (solo binario, solo complemento a due, …).
   *
   * ⚠️ Fa parte della config SALVATA nel tentativo, non solo del catalogo: la
   * correzione ricostruisce le domande dal seed, e senza gli stessi vincoli
   * ricostruirebbe esercizi diversi da quelli somministrati. È anche ciò che
   * rende una prova già svolta immune a una futura modifica del catalogo.
   */
  constraints?: Constraints;
  /** Soglia di sufficienza espressa in voto (default 6). */
  passGrade: number;
}

export const DEFAULT_CONFIG: ExamConfig = {
  durationMin: 30,
  questionCount: 10,
  modules: [...MODULES],
  difficulty: 'medium',
  passGrade: 6,
};

/** Config somministrabile a partire da una voce del catalogo. */
export function configFromSpec(spec: ExamSpec, durationOverrideMin?: number | null): ExamConfig {
  return {
    durationMin: clampInt(durationOverrideMin ?? spec.durationMin, 1, 240, spec.durationMin),
    questionCount: spec.questionCount,
    modules: [...spec.modules],
    difficulty: spec.difficulty,
    constraints: spec.constraints,
    passGrade: spec.passGrade,
  };
}

/** Valida/normalizza una config arrivata dal client o dal DB. */
export function parseConfig(raw: unknown): ExamConfig {
  const c = (typeof raw === 'object' && raw !== null ? raw : {}) as Partial<ExamConfig>;
  const modules = Array.isArray(c.modules) ? c.modules.filter((m): m is ModuleKey => MODULES.includes(m as ModuleKey)) : [];
  const difficulty: Difficulty = c.difficulty === 'easy' || c.difficulty === 'hard' ? c.difficulty : 'medium';
  return {
    durationMin: clampInt(c.durationMin, 1, 240, DEFAULT_CONFIG.durationMin),
    questionCount: clampInt(c.questionCount, 1, 50, DEFAULT_CONFIG.questionCount),
    modules: modules.length ? modules : [...MODULES],
    difficulty,
    constraints: parseConstraints(c.constraints),
    passGrade: clampNum(c.passGrade, 0, 10, DEFAULT_CONFIG.passGrade),
  };
}

/** Ripulisce i vincoli letti dal DB: numeri e chiavi note, niente altro. */
function parseConstraints(raw: unknown): Constraints | undefined {
  if (typeof raw !== 'object' || raw === null) return undefined;
  const c = raw as Record<string, unknown>;
  const nums = (v: unknown): number[] | undefined => {
    if (!Array.isArray(v)) return undefined;
    const out = v.map(Number).filter((n) => Number.isFinite(n));
    return out.length ? out : undefined;
  };
  const strs = <T extends string>(v: unknown, allowed: readonly T[]): T[] | undefined => {
    if (!Array.isArray(v)) return undefined;
    const out = v.filter((x): x is T => allowed.includes(x as T));
    return out.length ? out : undefined;
  };
  const anchor = Number(c.anchorBase);
  const out: Constraints = {
    anchorBase: Number.isFinite(anchor) ? anchor : undefined,
    bases: nums(c.bases),
    bits: nums(c.bits),
    ops: strs(c.ops, ['add', 'sub', 'mul'] as const),
    reprs: strs(c.reprs, ['twos', 'ones', 'signMag', 'excess'] as const),
    formats: strs(c.formats, ['half', 'single', 'double'] as const),
  };
  return Object.values(out).some((v) => v !== undefined) ? out : undefined;
}

function clampInt(v: unknown, min: number, max: number, fallback: number): number {
  const n = Math.round(Number(v));
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

function clampNum(v: unknown, min: number, max: number, fallback: number): number {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

/** Ricostruisce la prova esatta a partire dal seed salvato. */
export function buildExam(config: ExamConfig, seed: number): Exercise[] {
  return generateSet(config.modules, config.difficulty, config.questionCount, seed, config.constraints);
}

/** Voto in decimi: lineare sulla percentuale, arrotondato a 0,25, in [0, 10]. */
export function computeGrade(pct: number): number {
  const v = Math.round(pct * 10 * 4) / 4;
  return Math.max(0, Math.min(10, v));
}

export interface QuestionOutcome {
  index: number;
  module: ModuleKey;
  kind: string;
  params: Record<string, string | number>;
  given: string;
  expected: string;
  correct: boolean;
  points: number;
  earned: number;
}

export interface ExamOutcome {
  score: number;
  maxScore: number;
  pct: number;
  grade: number;
  passed: boolean;
  correctCount: number;
  totalCount: number;
  questions: QuestionOutcome[];
}

/**
 * Corregge una prova. `answers[i]` è la risposta data alla domanda i
 * (stringa vuota o mancante = non risposto).
 */
export function gradeExam(config: ExamConfig, seed: number, answers: (string | null | undefined)[]): ExamOutcome {
  const exercises = buildExam(config, seed);
  let score = 0;
  let maxScore = 0;
  let correctCount = 0;
  const questions: QuestionOutcome[] = exercises.map((ex, i) => {
    const given = (answers[i] ?? '').toString();
    const correct = given.trim() !== '' && checkAnswer(ex, given);
    maxScore += ex.points;
    if (correct) {
      score += ex.points;
      correctCount++;
    }
    return {
      index: i,
      module: ex.module,
      kind: ex.kind,
      params: ex.params,
      given,
      expected: ex.answer,
      correct,
      points: ex.points,
      earned: correct ? ex.points : 0,
    };
  });
  const pct = maxScore > 0 ? score / maxScore : 0;
  const grade = computeGrade(pct);
  return {
    score,
    maxScore,
    pct,
    grade,
    passed: grade >= config.passGrade,
    correctCount,
    totalCount: exercises.length,
    questions,
  };
}
