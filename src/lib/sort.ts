/**
 * Ordinamento per colonna delle tabelle della console: il docente clicca
 * un'intestazione, la tabella si ordina per quella colonna, un secondo clic
 * inverte il verso. Stesse regole di VLSM.
 *
 * Modulo PURO: le regole sono le stesse per tutte le tabelle, e una tabella
 * dichiara soltanto quale valore ordina ogni colonna. La parte React sta in
 * src/hooks/useSort.ts e src/components/ui/ThSort.tsx.
 */

export type SortDir = 'asc' | 'desc';

export interface SortState<K extends string = string> {
  column: K;
  dir: SortDir;
}

/** Il valore su cui si ordina una riga. `null`/`undefined` = dato assente. */
export type SortValue = string | number | null | undefined;

// Alfabetico all'italiana: maiuscole, minuscole e accenti non contano,
// e «4AI» viene prima di «10AI».
const collator = new Intl.Collator('it', { sensitivity: 'base', numeric: true });

export const compareText = (a: string, b: string): number => collator.compare(a, b);

/** Clic su un'intestazione: sulla colonna attiva inverte il verso, su un'altra parte da `firstDir`. */
export function nextSort<K extends string>(current: SortState<K>, column: K, firstDir: SortDir = 'asc'): SortState<K> {
  if (current.column === column) return { column, dir: current.dir === 'asc' ? 'desc' : 'asc' };
  return { column, dir: firstDir };
}

function compare(a: string | number, b: string | number): number {
  if (typeof a === 'string' && typeof b === 'string') return compareText(a, b);
  if (typeof a === 'number' && typeof b === 'number') return a < b ? -1 : a > b ? 1 : 0;
  return typeof a === 'number' ? -1 : 1;
}

/**
 * Le righe ordinate per `value` nel verso dato, senza toccare l'array di
 * partenza. I dati assenti vanno sempre in fondo, in entrambi i versi. A
 * parità decide `tieBreak` (di solito il nome), poi l'ordine di partenza.
 */
export function sortRows<T>(rows: readonly T[], value: (r: T) => SortValue, dir: SortDir, tieBreak?: (a: T, b: T) => number): T[] {
  const sign = dir === 'asc' ? 1 : -1;
  const empty = (v: SortValue) => v === null || v === undefined || (typeof v === 'number' && Number.isNaN(v));
  return rows
    .map((r, i) => ({ r, i, k: value(r) }))
    .sort((x, y) => {
      const xe = empty(x.k);
      const ye = empty(y.k);
      if (xe !== ye) return xe ? 1 : -1;
      if (!xe && !ye) {
        const c = compare(x.k as string | number, y.k as string | number);
        if (c !== 0) return c * sign;
      }
      return (tieBreak?.(x.r, y.r) ?? 0) || x.i - y.i;
    })
    .map(({ r }) => r);
}

/** Un istante ISO come numero ordinabile; illeggibile o assente = `null`. */
export function instant(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const ms = Date.parse(iso);
  return Number.isNaN(ms) ? null : ms;
}
