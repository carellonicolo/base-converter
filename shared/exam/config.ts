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

import { MODULES, type Difficulty, type ModuleKey, generateSet, checkAnswer, type Exercise } from '../exercises/generator';

export interface ExamConfig {
  enabled: boolean;
  durationMin: number;
  questionCount: number;
  modules: ModuleKey[];
  difficulty: Difficulty;
  /** Soglia di sufficienza espressa in voto (default 6). */
  passGrade: number;
}

export const DEFAULT_CONFIG: ExamConfig = {
  enabled: false,
  durationMin: 30,
  questionCount: 10,
  modules: [...MODULES],
  difficulty: 'medium',
  passGrade: 6,
};

/** Chiave della configurazione predefinita (classi senza riga propria). */
export const DEFAULT_CLASS = '*';

/** Valida/normalizza una config arrivata dal client o dal DB. */
export function parseConfig(raw: unknown): ExamConfig {
  const c = (typeof raw === 'object' && raw !== null ? raw : {}) as Partial<ExamConfig>;
  const modules = Array.isArray(c.modules) ? c.modules.filter((m): m is ModuleKey => MODULES.includes(m as ModuleKey)) : [];
  const difficulty: Difficulty = c.difficulty === 'easy' || c.difficulty === 'hard' ? c.difficulty : 'medium';
  return {
    enabled: !!c.enabled,
    durationMin: clampInt(c.durationMin, 1, 240, DEFAULT_CONFIG.durationMin),
    questionCount: clampInt(c.questionCount, 1, 50, DEFAULT_CONFIG.questionCount),
    modules: modules.length ? modules : [...MODULES],
    difficulty,
    passGrade: clampNum(c.passGrade, 0, 10, DEFAULT_CONFIG.passGrade),
  };
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
  return generateSet(config.modules, config.difficulty, config.questionCount, seed);
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
