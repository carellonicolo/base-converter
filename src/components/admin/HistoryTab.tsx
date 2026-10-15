import { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshCw, History } from 'lucide-react';
import { useI18n } from '../../i18n';
import { LoadState } from '../ui/LoadState';
import { ThSort } from '../ui/ThSort';
import { useSort, type SortColumn } from '../../hooks/useSort';
import { teacherApi, type SessionSummary } from '../../lib/teacherApi';
import { fmtDate, fmtGrade, fmtTime, gradeColor } from '../../lib/format';
import { compareText, instant } from '../../lib/sort';
import { SessionView } from './SessionView';
import { SessionStateChip, TabHead, examLabel, targetLabel, type Tfn } from './common';

type Col = 'date' | 'target' | 'exam' | 'state' | 'submitted' | 'avg' | 'passed';

function columns(t: Tfn): SortColumn<SessionSummary, Col>[] {
  return [
    { key: 'date', label: t('admin.date'), dir: 'desc', value: (s) => instant(s.createdAt) },
    { key: 'target', label: t('admin.target'), value: (s) => targetLabel(s) },
    { key: 'exam', label: t('admin.exam'), value: (s) => examLabel(s.exam, s.examId, t) },
    { key: 'state', label: t('admin.stateCol'), value: (s) => (s.state === 'open' ? 0 : s.state === 'expired' ? 1 : 2) },
    { key: 'submitted', label: t('admin.submittedCount'), dir: 'desc', value: (s) => s.submitted },
    { key: 'avg', label: t('admin.average'), dir: 'desc', value: (s) => s.avgGrade },
    { key: 'passed', label: t('admin.passedCol'), dir: 'desc', value: (s) => (s.submitted ? s.passed / s.submitted : null) },
  ];
}

const newestFirst = (a: SessionSummary, b: SessionSummary) => (instant(b.createdAt) ?? 0) - (instant(a.createdAt) ?? 0);

/**
 * Lo storico: ogni assegnazione è una sessione, che si riapre in seguito per
 * risultati, analisi, assenti e recupero. Le personali stanno con le altre,
 * riconoscibili dal nome dello studente.
 */
export function HistoryTab({ sessionId, onOpen }: { sessionId: string | null; onOpen: (id: string | null) => void }) {
  const { t } = useI18n();
  const [rows, setRows] = useState<SessionSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [cls, setCls] = useState('');
  const [kind, setKind] = useState<'all' | 'class' | 'student'>('all');

  const load = useCallback(async () => {
    setLoading(true);
    const res = await teacherApi.sessions();
    setLoading(false);
    if (res.ok && res.data) {
      setRows(res.data.assignments);
      setError(null);
    } else setError(res.error ?? `HTTP ${res.status}`);
  }, []);

  useEffect(() => {
    if (!sessionId) void load();
  }, [load, sessionId]);

  const cols = useMemo(() => columns(t), [t]);
  const classes = useMemo(() => [...new Set((rows ?? []).map((s) => s.class).filter(Boolean))].sort(compareText), [rows]);
  const visible = useMemo(
    () => (rows ?? []).filter((s) => (!cls || s.class === cls) && (kind === 'all' || s.targetType === kind)),
    [rows, cls, kind]
  );
  const { sorted, header } = useSort(visible, cols, { column: 'date', dir: 'desc' }, newestFirst);

  if (sessionId) return <SessionView key={sessionId} id={sessionId} onBack={() => onOpen(null)} />;

  return (
    <>
      <TabHead
        title={
          <span className="row" style={{ display: 'inline-flex' }}>
            <History size={20} color="var(--primary)" /> {t('admin.historyTitle')}
          </span>
        }
        lead={t('admin.historyLead')}
        actions={
          <>
            <select value={cls} onChange={(e) => setCls(e.target.value)} aria-label={t('admin.classLabel')} style={{ width: 'auto' }}>
              <option value="">{t('admin.allClasses')}</option>
              {classes.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <select value={kind} onChange={(e) => setKind(e.target.value as typeof kind)} aria-label={t('admin.target')} style={{ width: 'auto' }}>
              <option value="all">{t('admin.kindAll')}</option>
              <option value="class">{t('admin.kindClass')}</option>
              <option value="student">{t('admin.kindStudent')}</option>
            </select>
            <button className="btn btn-sm btn-ghost" type="button" onClick={() => void load()} disabled={loading}>
              <RefreshCw size={14} /> {t('admin.refresh')}
            </button>
          </>
        }
      />

      {!rows ? (
        <div className="card">
          <LoadState t={t} error={error} onRetry={() => void load()} />
        </div>
      ) : sorted.length === 0 ? (
        <div className="card hint" style={{ textAlign: 'center' }}>
          {t('admin.historyEmpty')}
        </div>
      ) : (
        <div className="card">
          <div className="table-wrap">
            <table className="result-table" style={{ marginBottom: 0 }}>
              <thead>
                <tr>
                  {cols.map((c) => (
                    <ThSort key={c.key} {...header(c.key)} />
                  ))}
                </tr>
              </thead>
              <tbody>
                {sorted.map((s) => (
                  <tr
                    key={s.id}
                    className="row-link"
                    tabIndex={0}
                    role="button"
                    aria-label={t('admin.openSessionOf', { target: targetLabel(s), date: fmtDate(s.createdAt) })}
                    onClick={() => onOpen(s.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onOpen(s.id);
                      }
                    }}
                  >
                    <td style={{ whiteSpace: 'nowrap' }}>
                      {fmtDate(s.createdAt)}
                      <div className="hint" style={{ fontSize: '0.75rem' }}>
                        {fmtTime(s.createdAt)}
                        {s.openUntil ? `–${fmtTime(s.openUntil)}` : ''}
                      </div>
                    </td>
                    <td>
                      <strong>{targetLabel(s)}</strong>
                      {s.targetType === 'student' && <div className="hint" style={{ fontSize: '0.75rem' }}>{t('admin.personal')}</div>}
                    </td>
                    <td>{examLabel(s.exam, s.examId, t)}</td>
                    <td>
                      <SessionStateChip s={s} />
                    </td>
                    <td>
                      {s.submitted}
                      {s.enrolled !== null && <span className="hint">/{s.enrolled}</span>}
                      {s.live + s.annulled > 0 && (
                        <div className="hint" style={{ fontSize: '0.75rem' }}>
                          {[s.live > 0 && t('admin.nLive', { n: s.live }), s.annulled > 0 && t('admin.nAnnulled', { n: s.annulled })].filter(Boolean).join(' · ')}
                        </div>
                      )}
                    </td>
                    <td>
                      <strong className="mono" style={{ color: s.avgGrade !== null ? gradeColor(s.avgGrade) : undefined }}>
                        {fmtGrade(s.avgGrade)}
                      </strong>
                    </td>
                    <td>{s.submitted ? `${s.passed}/${s.submitted}` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
