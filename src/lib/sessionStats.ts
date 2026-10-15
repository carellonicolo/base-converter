/**
 * Le statistiche di voto di una sessione: media, mediana, estremi,
 * sufficienze e distribuzione per fasce in decimi.
 *
 * Contano solo le prove CONSEGNATE: una prova in corso o interrotta non ha
 * un voto da mettere in media. Modulo PURO.
 */

export interface GradeStats {
  n: number;
  mean: number | null;
  median: number | null;
  min: number | null;
  max: number | null;
  passed: number;
  failed: number;
  /** Quante prove per fascia: «≤3», «4», …, «10» (voto arrotondato per difetto). */
  bins: { label: string; n: number; pass: boolean }[];
}

export const BIN_LABELS = ['≤3', '4', '5', '6', '7', '8', '9', '10'] as const;

const round2 = (n: number) => Math.round(n * 100) / 100;

function binOf(grade: number): string {
  const g = Math.floor(grade + 1e-9);
  return g <= 3 ? '≤3' : String(Math.min(g, 10));
}

export function gradeStats(grades: readonly number[], passGrade = 6): GradeStats {
  const sorted = [...grades].filter((g) => Number.isFinite(g)).sort((a, b) => a - b);
  const n = sorted.length;
  const counts = new Map<string, number>(BIN_LABELS.map((l) => [l, 0]));
  for (const g of sorted) counts.set(binOf(g), (counts.get(binOf(g)) ?? 0) + 1);
  const passed = sorted.filter((g) => g >= passGrade).length;
  const mid = Math.floor(n / 2);
  return {
    n,
    mean: n ? round2(sorted.reduce((s, g) => s + g, 0) / n) : null,
    median: n ? (n % 2 ? sorted[mid] : round2((sorted[mid - 1] + sorted[mid]) / 2)) : null,
    min: n ? sorted[0] : null,
    max: n ? sorted[n - 1] : null,
    passed,
    failed: n - passed,
    bins: BIN_LABELS.map((label) => ({ label, n: counts.get(label) ?? 0, pass: Number(label) >= passGrade })),
  };
}
