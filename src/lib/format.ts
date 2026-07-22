/** Formattazioni condivise (voto all'italiana, date, durate). */

/** Voto in decimi all'italiana: 7.5 → "7,5"; null → "—". */
export function fmtGrade(v: number | null | undefined): string {
  if (v === null || v === undefined || Number.isNaN(v)) return '—';
  return (Math.round(v * 100) / 100).toString().replace('.', ',');
}

/** Colore semantico del voto (sufficiente / insufficiente). */
export function gradeColor(v: number | null | undefined): string {
  if (v === null || v === undefined) return 'var(--muted)';
  return v >= 6 ? 'var(--success)' : 'var(--error)';
}

/** Data breve in italiano. */
export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/** Data e ora brevi. */
export function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('it-IT', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
}

/** Millisecondi → "mm:ss". */
export function fmtClock(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
