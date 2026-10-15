import { useCallback, useEffect, useMemo, useState } from 'react';
import { BarChart3, Download, RefreshCw } from 'lucide-react';
import { useI18n } from '../../i18n';
import { LoadState } from '../ui/LoadState';
import { ThSort } from '../ui/ThSort';
import { useSort, type SortColumn } from '../../hooks/useSort';
import { teacherApi, type AttemptSummary } from '../../lib/teacherApi';
import { fmtDateTime, fmtGrade } from '../../lib/format';
import { surnameFirst } from '../../lib/names';
import { compareText, instant } from '../../lib/sort';
import { buildCsv, downloadCsv, safeFileName } from '../../lib/csv';
import { AttemptModal } from './AttemptModal';
import { AttemptStateChip, DistractionCell, GradeCell, StatTiles, TabHead, examLabel, type Tfn } from './common';

type Col = 'student' | 'class' | 'exam' | 'grade' | 'correct' | 'distractions' | 'date';
type Outcome = 'all' | 'pass' | 'fail' | 'annulled';

function columns(t: Tfn): SortColumn<AttemptSummary, Col>[] {
  return [
    { key: 'student', label: t('admin.student'), value: (a) => surnameFirst(a.name) },
    { key: 'class', label: t('admin.classLabel'), value: (a) => a.class },
    { key: 'exam', label: t('admin.exam'), value: (a) => examLabel(a.exam, a.examId, t) },
    { key: 'grade', label: t('admin.grade'), dir: 'desc', value: (a) => (a.state === 'consegnata' ? a.grade : null) },
    { key: 'correct', label: t('admin.correct'), dir: 'desc', value: (a) => a.correctCount },
    { key: 'distractions', label: t('admin.distractions'), dir: 'desc', value: (a) => a.awayEvents + a.fullscreenExits + a.warnings * 10 },
    { key: 'date', label: t('admin.date'), dir: 'desc', value: (a) => instant(a.submittedAt ?? a.startedAt) },
  ];
}

const newestFirst = (a: AttemptSummary, b: AttemptSummary) => (instant(b.submittedAt ?? b.startedAt) ?? 0) - (instant(a.submittedAt ?? a.startedAt) ?? 0);

/** Tutti gli esiti, filtrabili per classe, verifica, esito e studente. */
export function ResultsTab() {
  const { t } = useI18n();
  const [rows, setRows] = useState<AttemptSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cls, setCls] = useState('');
  const [exam, setExam] = useState('');
  const [outcome, setOutcome] = useState<Outcome>('all');
  const [query, setQuery] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await teacherApi.results({ all: true });
    if (res.ok && res.data) {
      setRows(res.data.results);
      setError(null);
    } else setError(res.error ?? `HTTP ${res.status}`);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const cols = useMemo(() => columns(t), [t]);
  const classes = useMemo(() => [...new Set((rows ?? []).map((r) => r.class ?? '').filter(Boolean))].sort(compareText), [rows]);
  const exams = useMemo(() => {
    const m = new Map<string, string>();
    for (const r of rows ?? []) if (r.examId) m.set(r.examId, examLabel(r.exam, r.examId, t));
    return [...m].sort((a, b) => compareText(a[1], b[1]));
  }, [rows, t]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (rows ?? []).filter((r) => {
      if (cls && r.class !== cls) return false;
      if (exam && r.examId !== exam) return false;
      if (q && !r.name.toLowerCase().includes(q) && !surnameFirst(r.name).toLowerCase().includes(q) && !r.email.toLowerCase().includes(q)) return false;
      const pass = r.state === 'consegnata' && (r.grade ?? 0) >= (r.exam?.passGrade ?? 6);
      if (outcome === 'annulled') return r.state === 'annullata';
      if (outcome === 'pass') return pass;
      if (outcome === 'fail') return r.state === 'consegnata' && !pass;
      return true;
    });
  }, [rows, cls, exam, query, outcome]);

  const { sorted, header } = useSort(visible, cols, { column: 'date', dir: 'desc' }, newestFirst);

  const graded = visible.filter((r) => r.state === 'consegnata' && r.grade !== null);
  const mean = graded.length ? graded.reduce((s, r) => s + (r.grade ?? 0), 0) / graded.length : null;
  const filtered = !!(cls || exam || query || outcome !== 'all');

  const exportCsv = () => {
    const head = [t('admin.csvName'), 'Email', t('admin.classLabel'), t('admin.exam'), t('admin.stateCol'), t('admin.grade'), t('admin.correct'), t('admin.total'), t('admin.pageExits'), t('admin.secondsAway'), t('admin.fullscreenExits'), t('admin.warnings'), t('admin.date')];
    const data = sorted.map((a) => [
      surnameFirst(a.name), a.email, a.class, examLabel(a.exam, a.examId, t), t(`admin.attempt_${a.state}`), a.state === 'consegnata' ? a.grade : null,
      a.correctCount, a.totalCount, a.awayEvents, Math.round(a.awayMs / 1000), a.fullscreenExits, a.warnings, fmtDateTime(a.submittedAt ?? a.startedAt),
    ]);
    downloadCsv(`risultati${cls ? `_${safeFileName(cls)}` : ''}_${new Date().toLocaleDateString('sv-SE')}.csv`, buildCsv(head, data));
  };

  return (
    <>
      <TabHead
        title={
          <span className="row" style={{ display: 'inline-flex' }}>
            <BarChart3 size={20} color="var(--primary)" /> {t('admin.resultsTitle')}
          </span>
        }
        lead={t('admin.resultsLead')}
        actions={
          <>
            <button className="btn btn-sm btn-ghost" type="button" onClick={exportCsv} disabled={sorted.length === 0}>
              <Download size={14} /> {t('admin.exportCsv')}
            </button>
            <button className="btn btn-sm btn-ghost" type="button" onClick={() => void load()}>
              <RefreshCw size={14} /> {t('admin.refresh')}
            </button>
          </>
        }
      >
        <div className="filters">
          <label>
            <span>{t('admin.classLabel')}</span>
            <select value={cls} onChange={(e) => setCls(e.target.value)}>
              <option value="">{t('admin.allClasses')}</option>
              {classes.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>{t('admin.exam')}</span>
            <select value={exam} onChange={(e) => setExam(e.target.value)}>
              <option value="">{t('admin.allExams')}</option>
              {exams.map(([id, label]) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>{t('admin.outcome')}</span>
            <select value={outcome} onChange={(e) => setOutcome(e.target.value as Outcome)}>
              <option value="all">{t('admin.outcomeAll')}</option>
              <option value="pass">{t('admin.outcomePass')}</option>
              <option value="fail">{t('admin.outcomeFail')}</option>
              <option value="annulled">{t('admin.outcomeAnnulled')}</option>
            </select>
          </label>
          <label>
            <span>{t('admin.student')}</span>
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('admin.searchStudent')} />
          </label>
        </div>
        {filtered && (
          <button
            className="btn btn-sm btn-ghost"
            type="button"
            onClick={() => {
              setCls('');
              setExam('');
              setQuery('');
              setOutcome('all');
            }}
            style={{ marginTop: '0.6rem' }}
          >
            {t('admin.resetFilters')}
          </button>
        )}
      </TabHead>

      {!rows ? (
        <div className="card">
          <LoadState t={t} error={error} onRetry={() => void load()} />
        </div>
      ) : (
        <>
          <StatTiles
            tiles={[
              { label: t('admin.resultsCount'), value: String(visible.length) },
              { label: t('admin.average'), value: fmtGrade(mean === null ? null : Math.round(mean * 100) / 100), tone: 'good' },
              { label: t('admin.passedCol'), value: String(graded.filter((r) => (r.grade ?? 0) >= (r.exam?.passGrade ?? 6)).length) },
              { label: t('admin.annulledCount'), value: String(visible.filter((r) => r.state === 'annullata').length) },
            ]}
          />
          <div className="card">
            {sorted.length === 0 ? (
              <p className="hint" style={{ margin: 0 }}>{rows.length === 0 ? t('admin.noResults') : t('admin.noResultsFiltered')}</p>
            ) : (
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
                    {sorted.map((a) => (
                      <tr key={a.id} className="row-link" tabIndex={0} role="button" onClick={() => setOpenId(a.id)} onKeyDown={(e) => e.key === 'Enter' && setOpenId(a.id)}>
                        <td>
                          {surnameFirst(a.name)}
                          <div className="hint" style={{ fontSize: '0.72rem' }}>{a.email}</div>
                        </td>
                        <td>{a.class ?? '—'}</td>
                        <td>{examLabel(a.exam, a.examId, t)}</td>
                        <td>{a.state === 'consegnata' ? <GradeCell a={a} /> : <AttemptStateChip a={a} />}</td>
                        <td className="mono">
                          {a.correctCount}/{a.totalCount}
                        </td>
                        <td>
                          <DistractionCell a={a} />
                        </td>
                        <td style={{ whiteSpace: 'nowrap' }}>{fmtDateTime(a.submittedAt ?? a.startedAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
      {openId && <AttemptModal attemptId={openId} onClose={() => setOpenId(null)} onDeleted={() => void load()} />}
    </>
  );
}
