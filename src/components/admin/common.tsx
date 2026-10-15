/**
 * Pezzi condivisi dalle schede della console: etichette, chip di stato,
 * celle ricorrenti, riquadri statistici, selettore di classe.
 */
import { useEffect, useState, type ReactNode } from 'react';
import { useI18n } from '../../i18n';
import { examTitle } from '../../lib/exerciseText';
import { fmtDuration, fmtGrade, gradeColor } from '../../lib/format';
import { surnameFirst } from '../../lib/names';
import type { AttemptSummary, ExamRef, SessionSummary } from '../../lib/teacherApi';

export type Tfn = (k: string, v?: Record<string, string | number>) => string;

/** «Binario · Base», o l'id se la voce non è più nel catalogo. */
export function examLabel(exam: Pick<ExamRef, 'topic' | 'level'> | null, fallbackId: string | null, t: Tfn): string {
  return exam ? examTitle(exam.topic, exam.level, t) : `${fallbackId ?? '—'} · ${t('admin.staleExam')}`;
}

/** «3A», o «Rossi Mario (3A)» per un'assegnazione personale. */
export function targetLabel(s: Pick<SessionSummary, 'targetType' | 'class' | 'studentName'>): string {
  if (s.targetType === 'student') return `${surnameFirst(s.studentName)}${s.class ? ` (${s.class})` : ''}`;
  return s.class;
}

/** La finestra in parole: «15 min», «1 h 30 min». */
export function fmtWindow(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

/**
 * L'ora del server, avanzata al secondo: i conti alla rovescia si fanno su
 * quella, che è l'orologio che chiude le finestre.
 */
export function useServerNow(serverNow: string | null | undefined, tickMs = 15_000): number {
  const [skew, setSkew] = useState(0);
  const [, setTick] = useState(0);
  useEffect(() => {
    if (serverNow) setSkew(Date.parse(serverNow) - Date.now());
  }, [serverNow]);
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), tickMs);
    return () => clearInterval(id);
  }, [tickMs]);
  return Date.now() + skew;
}

export function SessionStateChip({ s }: { s: Pick<SessionSummary, 'state' | 'reopenedAt'> }) {
  const { t } = useI18n();
  return (
    <span className="row" style={{ gap: '0.3rem', display: 'inline-flex' }}>
      <span className={`chip ${s.state === 'open' ? 'chip-ok' : s.state === 'expired' ? 'chip-warn' : ''}`}>
        {t(`admin.state_${s.state}`)}
      </span>
      {s.reopenedAt && <span className="chip chip-mini">{t('admin.recovery')}</span>}
    </span>
  );
}

export function AttemptStateChip({ a }: { a: Pick<AttemptSummary, 'state'> }) {
  const { t } = useI18n();
  const cls = a.state === 'consegnata' ? 'chip-ok' : a.state === 'in_corso' ? 'chip-warn' : 'chip-ko';
  return <span className={`chip ${cls}`}>{t(`admin.attempt_${a.state}`)}</span>;
}

export function GradeCell({ a }: { a: Pick<AttemptSummary, 'state' | 'grade'> }) {
  if (a.state !== 'consegnata') return <span className="hint">—</span>;
  return (
    <strong className="mono" style={{ color: gradeColor(a.grade) }}>
      {fmtGrade(a.grade)}
    </strong>
  );
}

/** Uscite dalla pagina (con il tempo fuori), uscite dallo schermo intero, ammonizioni. */
export function DistractionCell({ a }: { a: Pick<AttemptSummary, 'awayEvents' | 'awayMs' | 'fullscreenExits' | 'warnings'> }) {
  const { t } = useI18n();
  const clean = a.awayEvents === 0 && a.fullscreenExits === 0 && a.warnings === 0;
  if (clean) return <span style={{ color: 'var(--success)' }}>✓ 0</span>;
  return (
    <span className="distraction-cell">
      {a.awayEvents > 0 && (
        <span title={t('admin.awayTitle', { n: a.awayEvents, time: fmtDuration(a.awayMs) })} className="warn-text">
          ⚠ {a.awayEvents} <span className="hint">({fmtDuration(a.awayMs)})</span>
        </span>
      )}
      {a.fullscreenExits > 0 && (
        <span title={t('admin.fullscreenTitle')} className="warn-text">
          ⛶ {a.fullscreenExits}
        </span>
      )}
      {a.warnings > 0 && (
        <span title={t('admin.warningsTitle')} className="error-text">
          ✋ {a.warnings}
        </span>
      )}
    </span>
  );
}

export interface Tile {
  label: string;
  value: string;
  tone?: 'good' | 'warn' | 'bad';
  /** Valore lungo (es. un intervallo): carattere più piccolo, su una riga. */
  small?: boolean;
}

export function StatTiles({ tiles }: { tiles: Tile[] }) {
  return (
    <div className="stat-grid">
      {tiles.map((tile) => (
        <div key={tile.label} className={`stat-tile${tile.tone ? ` stat-${tile.tone}` : ''}${tile.small ? ' stat-small' : ''}`}>
          <div className="stat-value">{tile.value}</div>
          <div className="stat-label">{tile.label}</div>
        </div>
      ))}
    </div>
  );
}

/** Intestazione di una scheda: titolo, sottotitolo, azioni a destra. */
export function TabHead({ title, lead, actions, children }: { title: ReactNode; lead?: ReactNode; actions?: ReactNode; children?: ReactNode }) {
  return (
    <div className="card">
      <div className="tab-head">
        <div style={{ minWidth: 0 }}>
          <h2 className="tab-title">{title}</h2>
          {lead && <p className="hint tab-lead">{lead}</p>}
        </div>
        {actions && <div className="tab-actions">{actions}</div>}
      </div>
      {children}
    </div>
  );
}

/* ---------------- Classi ---------------- */

/** Chiave del gruppo di chi non ha ancora una classe approvata. */
export const NO_CLASS = '';
const CLASS_KEY = 'bc_admin_class';

/** La classe aperta, ricordata fra una visita e l'altra (comodità di questo browser). */
export function useRememberedClass(): [string | null, (c: string | null) => void] {
  const [cls, setCls] = useState<string | null>(() => {
    try {
      return localStorage.getItem(CLASS_KEY);
    } catch {
      return null;
    }
  });
  return [
    cls,
    (c) => {
      setCls(c);
      try {
        if (c === null) localStorage.removeItem(CLASS_KEY);
        else localStorage.setItem(CLASS_KEY, c);
      } catch {
        /* storage non disponibile: si riparte dall'elenco */
      }
    },
  ];
}

export interface ClassGroup {
  name: string;
  n: number;
}

/** Classi presenti con quanti studenti hanno; «senza classe» in fondo. */
export function groupByClass(students: { classes: string[] }[]): ClassGroup[] {
  const count = new Map<string, number>();
  for (const s of students) {
    const keys = s.classes.length ? s.classes : [NO_CLASS];
    for (const k of keys) count.set(k, (count.get(k) ?? 0) + 1);
  }
  return [...count]
    .map(([name, n]) => ({ name, n }))
    .sort((a, b) => {
      if ((a.name === NO_CLASS) !== (b.name === NO_CLASS)) return a.name === NO_CLASS ? 1 : -1;
      return a.name.localeCompare(b.name, 'it', { numeric: true });
    });
}

/** Un pulsante per classe: il docente sceglie la classe prima di vedere gli studenti. */
export function ClassPicker({ groups, onPick }: { groups: ClassGroup[]; onPick: (c: string) => void }) {
  const { t } = useI18n();
  return (
    <div className="class-picker">
      {groups.map((g) => (
        <button
          key={g.name || 'no-class'}
          type="button"
          className={`class-picker-btn${g.name === NO_CLASS ? ' muted' : ''}`}
          onClick={() => onPick(g.name)}
        >
          <span className="class-picker-name">{g.name || t('admin.noClass')}</span>
          <span className="class-picker-count">{t(g.n === 1 ? 'admin.nStudent' : 'admin.nStudents', { n: g.n })}</span>
        </button>
      ))}
    </div>
  );
}

export function classLabel(c: string, t: Tfn): string {
  return c === NO_CLASS ? t('admin.noClass') : c;
}
