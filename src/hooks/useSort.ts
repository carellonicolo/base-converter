import { useCallback, useMemo, useState } from 'react';
import { nextSort, sortRows, type SortDir, type SortState, type SortValue } from '../lib/sort';

export interface SortColumn<T, K extends string> {
  key: K;
  /** Il testo dell'intestazione. */
  label: string;
  /** Il verso del primo clic: 'asc' se omesso. */
  dir?: SortDir;
  value: (r: T) => SortValue;
}

/**
 * Lo stato di ordinamento di una tabella e le sue righe ordinate.
 *
 * `columns` e `tieBreak` vanno tenuti stabili (costanti di modulo o useMemo):
 * così le righe si riordinano solo quando cambiano i dati o la colonna.
 */
export function useSort<T, K extends string>(
  rows: readonly T[],
  columns: readonly SortColumn<T, K>[],
  initial: SortState<K>,
  tieBreak?: (a: T, b: T) => number
) {
  const [sort, setSort] = useState<SortState<K>>(initial);

  const sorted = useMemo(() => {
    const col = columns.find((c) => c.key === sort.column);
    return col ? sortRows(rows, col.value, sort.dir, tieBreak) : [...rows];
  }, [rows, columns, sort, tieBreak]);

  const toggle = useCallback(
    (key: K) => setSort((s) => nextSort(s, key, columns.find((c) => c.key === key)?.dir)),
    [columns]
  );

  /** Le props di <ThSort> per la colonna `key`. */
  const header = (key: K) => {
    const c = columns.find((x) => x.key === key);
    return { label: c?.label ?? key, dir: sort.column === key ? sort.dir : null, onSort: () => toggle(key) };
  };

  return { sorted, sort, header };
}
