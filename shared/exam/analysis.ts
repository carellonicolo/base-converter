/**
 * Dove sbaglia la classe: le domande di una sessione raggruppate per TIPO.
 *
 * Ogni studente ha una prova diversa (stesso catalogo, seme diverso), quindi
 * «la domanda 3» non vuol dire niente per la classe. Vuol dire qualcosa «la
 * conversione da base 16 a base 2», o «la sottrazione in base 2»: è il tipo
 * di esercizio, con i parametri che ne cambiano la natura e non quelli che
 * cambiano solo i numeri.
 *
 * Modulo PURO: lo usa la Function della sessione, che possiede seme e
 * risposte; la console riceve solo i conteggi e li etichetta nella lingua
 * scelta.
 */

import type { QuestionOutcome } from './config';

export interface Category {
  /** Chiave stabile del tipo, es. 'conv:16>2', 'arith:sub:2'. */
  key: string;
  kind: string;
  /** I soli parametri che distinguono il tipo, per l'etichetta. */
  params: Record<string, string | number>;
}

export interface CategoryStat extends Category {
  /** Quante volte il tipo è uscito nelle prove consegnate. */
  total: number;
  correct: number;
  /** Punti presi su punti in palio. */
  earned: number;
  points: number;
}

export function categoryOf(q: Pick<QuestionOutcome, 'kind' | 'params'>): Category {
  const p = q.params;
  switch (q.kind) {
    case 'conv':
      return { key: `conv:${p.from}>${p.to}`, kind: 'conv', params: { from: Number(p.from), to: Number(p.to) } };
    case 'arith':
      return { key: `arith:${p.op}:${p.base}`, kind: 'arith', params: { op: String(p.op), base: Number(p.base) } };
    case 'signedEncode':
    case 'signedDecode':
      return { key: `${q.kind}:${p.repr}`, kind: q.kind, params: { repr: String(p.repr) } };
    case 'ieeeValue':
      return { key: `ieeeValue:${p.format}`, kind: 'ieeeValue', params: { format: String(p.format) } };
    default:
      return { key: q.kind, kind: q.kind, params: {} };
  }
}

/**
 * Somma gli esiti per tipo. Ordinati dal più sbagliato (riuscita più bassa)
 * al più riuscito; a parità, il più frequente prima.
 */
export function analyzeByCategory(outcomes: readonly (readonly QuestionOutcome[])[]): CategoryStat[] {
  const map = new Map<string, CategoryStat>();
  for (const questions of outcomes) {
    for (const q of questions) {
      const c = categoryOf(q);
      const s = map.get(c.key) ?? { ...c, total: 0, correct: 0, earned: 0, points: 0 };
      s.total += 1;
      if (q.correct) s.correct += 1;
      s.earned += q.earned;
      s.points += q.points;
      map.set(c.key, s);
    }
  }
  const rate = (s: CategoryStat) => (s.points > 0 ? s.earned / s.points : 0);
  return [...map.values()].sort((a, b) => rate(a) - rate(b) || b.total - a.total || a.key.localeCompare(b.key));
}
