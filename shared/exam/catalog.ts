/**
 * Catalogo delle verifiche — il "pool" da cui il docente sceglie.
 *
 * Sta nel codice, non nel database: è versionato in git, si testa, e non può
 * essere corrotto da una schermata sbagliata. Stesso modello dei livelli di
 * VLSM.
 *
 * Sette argomenti, ciascuno in tre livelli graduati. La difficoltà governa la
 * GRANDEZZA dei numeri, i vincoli governano l'ARGOMENTO: esiste una prova sul
 * solo binario che è comunque impegnativa (livello Alta), ed è una cosa diversa
 * da una prova facile su tutte le basi.
 *
 * ⚠️ Gli `id` finiscono nel database dentro le assegnazioni: non vanno mai
 * rinominati, solo aggiunti. Se un id sparisce, le assegnazioni che lo citano
 * restano orfane (la console lo segnala invece di rompersi).
 */

import type { Constraints, Difficulty, ModuleKey } from '../exercises/generator';

export type TopicKey = 'binary' | 'hex' | 'mixed' | 'arith' | 'float' | 'signed' | 'twos';
export type Level = 1 | 2 | 3;

export const TOPICS: TopicKey[] = ['binary', 'hex', 'mixed', 'arith', 'float', 'signed', 'twos'];

export interface ExamSpec {
  id: string;
  topic: TopicKey;
  level: Level;
  modules: ModuleKey[];
  difficulty: Difficulty;
  constraints: Constraints;
  questionCount: number;
  durationMin: number;
  /** Soglia di sufficienza in decimi. */
  passGrade: number;
}

/** Durata e numero di domande crescono col livello. */
const SHAPE: Record<Level, { questionCount: number; durationMin: number }> = {
  1: { questionCount: 10, durationMin: 30 },
  2: { questionCount: 12, durationMin: 40 },
  3: { questionCount: 12, durationMin: 45 },
};

const DIFFICULTY: Record<Level, Difficulty> = { 1: 'easy', 2: 'medium', 3: 'hard' };

function spec(topic: TopicKey, level: Level, modules: ModuleKey[], constraints: Constraints): ExamSpec {
  return {
    id: `${topic}-${level}`,
    topic,
    level,
    modules,
    difficulty: DIFFICULTY[level],
    constraints,
    ...SHAPE[level],
    passGrade: 6,
  };
}

export const EXAMS: ExamSpec[] = [
  /* Solo binario — ogni conversione ha la base 2 da una parte o dall'altra. */
  spec('binary', 1, ['converter'], { anchorBase: 2, bases: [10] }),
  spec('binary', 2, ['converter'], { anchorBase: 2, bases: [10, 16] }),
  spec('binary', 3, ['converter'], { anchorBase: 2, bases: [8, 10, 16] }),

  /* Solo esadecimale — stessa logica con la base 16 come perno. */
  spec('hex', 1, ['converter'], { anchorBase: 16, bases: [10] }),
  spec('hex', 2, ['converter'], { anchorBase: 16, bases: [2, 10] }),
  spec('hex', 3, ['converter'], { anchorBase: 16, bases: [2, 8, 10] }),

  /* Mista — nessun perno: si converte fra basi qualsiasi. */
  spec('mixed', 1, ['converter'], { bases: [2, 8, 10, 16] }),
  spec('mixed', 2, ['converter'], { bases: [2, 3, 5, 8, 10, 16] }),
  spec('mixed', 3, ['converter'], { bases: [2, 3, 5, 7, 8, 10, 12, 16, 20, 36] }),

  /* Somme e sottrazioni in base. Niente moltiplicazioni: il titolo promette
     due operazioni e la prova deve mantenere la promessa. Cresce la base e la
     grandezza degli operandi. */
  spec('arith', 1, ['arithmetic'], { bases: [2], ops: ['add'] }),
  spec('arith', 2, ['arithmetic'], { bases: [2], ops: ['add', 'sub'] }),
  spec('arith', 3, ['arithmetic'], { bases: [2, 8, 16], ops: ['add', 'sub'] }),

  /* Virgola mobile IEEE 754. */
  spec('float', 1, ['ieee'], { formats: ['single'] }),
  spec('float', 2, ['ieee'], { formats: ['half'] }),
  spec('float', 3, ['ieee'], { formats: ['half', 'single'] }),

  /* Numeri con segno DIVERSI dal complemento a due: modulo e segno,
     complemento a uno, eccesso-K. Tenuti separati dalla prova sul complemento
     a due, che è un argomento a sé. */
  spec('signed', 1, ['signed'], { reprs: ['signMag'], bits: [8] }),
  spec('signed', 2, ['signed'], { reprs: ['signMag', 'ones'], bits: [8] }),
  spec('signed', 3, ['signed'], { reprs: ['signMag', 'ones', 'excess'], bits: [8, 16] }),

  /* Complemento a due, da solo. */
  spec('twos', 1, ['signed'], { reprs: ['twos'], bits: [8] }),
  spec('twos', 2, ['signed'], { reprs: ['twos'], bits: [8, 16] }),
  spec('twos', 3, ['signed'], { reprs: ['twos'], bits: [16, 32] }),
];

const BY_ID = new Map(EXAMS.map((e) => [e.id, e]));

/** La verifica con questo id, oppure null se l'id non esiste (più). */
export function findExam(id: string): ExamSpec | null {
  return BY_ID.get(id) ?? null;
}

export function examsByTopic(topic: TopicKey): ExamSpec[] {
  return EXAMS.filter((e) => e.topic === topic);
}
