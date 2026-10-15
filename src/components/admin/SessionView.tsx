import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Download, Plus, RefreshCw, RotateCcw, X } from 'lucide-react';
import { useI18n } from '../../i18n';
import { Modal } from '../ui/Modal';
import { LoadState } from '../ui/LoadState';
import { ThSort } from '../ui/ThSort';
import { useToast } from '../ui/Toast';
import { useConfirm } from '../ui/Confirm';
import { useSort, type SortColumn } from '../../hooks/useSort';
import { teacherApi, type AttemptSummary, type Enrolled, type SessionDetail } from '../../lib/teacherApi';
import { categoryLabel } from '../../lib/exerciseText';
import { fmtDate, fmtDateTime, fmtDuration, fmtGrade, fmtTime } from '../../lib/format';
import { surnameFirst } from '../../lib/names';
import { compareText, instant } from '../../lib/sort';
import { gradeStats, type GradeStats } from '../../lib/sessionStats';
import { buildCsv, downloadCsv, safeFileName } from '../../lib/csv';
import { DEFAULT_WINDOW_MIN, WINDOW_OPTIONS_MIN } from '../../../shared/exam/assignments';
import { AttemptModal } from './AttemptModal';
import {
  AttemptStateChip,
  DistractionCell,
  GradeCell,
  SessionStateChip,
  StatTiles,
  examLabel,
  fmtWindow,
  targetLabel,
  useServerNow,
  type Tfn,
} from './common';

type Col = 'student' | 'state' | 'grade' | 'correct' | 'duration' | 'distractions' | 'submitted';

const STATE_RANK: Record<string, number> = { consegnata: 0, in_corso: 1, annullata: 2 };

function durationMs(a: AttemptSummary): number | null {
  const start = instant(a.startedAt);
  const end = instant(a.submittedAt ?? a.lastSeenAt);
  return start !== null && end !== null ? Math.max(0, end - start) : null;
}

function columns(t: Tfn): SortColumn<AttemptSummary, Col>[] {
  return [
    { key: 'student', label: t('admin.student'), value: (a) => surnameFirst(a.name) },
    { key: 'state', label: t('admin.stateCol'), value: (a) => STATE_RANK[a.state] ?? 3 },
    { key: 'grade', label: t('admin.grade'), dir: 'desc', value: (a) => (a.state === 'consegnata' ? a.grade : null) },
    { key: 'correct', label: t('admin.correct'), dir: 'desc', value: (a) => a.correctCount },
    { key: 'duration', label: t('admin.duration'), value: durationMs },
    { key: 'distractions', label: t('admin.distractions'), dir: 'desc', value: (a) => a.awayEvents + a.fullscreenExits + a.warnings * 10 },
    { key: 'submitted', label: t('admin.submittedAt'), dir: 'desc', value: (a) => instant(a.submittedAt) },
  ];
}

const byName = (a: AttemptSummary, b: AttemptSummary) => compareText(surnameFirst(a.name), surnameFirst(b.name));

/** Le prove che meritano uno sguardo, col perché. */
function anomalies(attempts: AttemptSummary[], t: Tfn): { a: AttemptSummary; why: string[] }[] {
  const out: { a: AttemptSummary; why: string[] }[] = [];
  for (const a of attempts) {
    const why: string[] = [];
    if (a.state === 'annullata') why.push(t('admin.whyAnnulled'));
    if (a.state === 'in_corso') why.push(t('admin.whyLive'));
    if (a.submitReason === 'server') why.push(t('admin.whyServer'));
    if (a.submitReason === 'tempo') why.push(t('admin.whyTimeout'));
    if (a.awayEvents > 0) why.push(t('admin.whyAway', { n: a.awayEvents, time: fmtDuration(a.awayMs) }));
    if (a.fullscreenExits > 0) why.push(t('admin.whyFullscreen', { n: a.fullscreenExits }));
    if (a.warnings > 0) why.push(t('admin.whyWarnings', { n: a.warnings }));
    if (why.length) out.push({ a, why });
  }
  return out.sort((x, y) => byName(x.a, y.a));
}

/**
 * Una sessione: com'è andata la classe, dove ha sbagliato, chi mancava, le
 * prove da guardare. Da qui si riapre la verifica per il recupero: la
 * possono iniziare solo gli assenti.
 */
export function SessionView({ id, onBack }: { id: string; onBack: () => void }) {
  const { t } = useI18n();
  const toast = useToast();
  const confirm = useConfirm();
  const [data, setData] = useState<SessionDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [openAttempt, setOpenAttempt] = useState<string | null>(null);
  const [reopen, setReopen] = useState(false);
  const now = useServerNow(data?.now);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await teacherApi.session(id);
    setLoading(false);
    if (res.ok && res.data) {
      setData(res.data);
      setError(null);
    } else setError(res.error ?? `HTTP ${res.status}`);
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const cols = useMemo(() => columns(t), [t]);
  const attempts = useMemo(() => data?.attempts ?? [], [data]);
  const { sorted, header } = useSort(attempts, cols, { column: 'student', dir: 'asc' }, byName);

  const s = data?.session;
  const passGrade = s?.exam?.passGrade ?? 6;
  const stats = useMemo(
    () => gradeStats(attempts.filter((a) => a.state === 'consegnata' && a.grade !== null).map((a) => a.grade as number), passGrade),
    [attempts, passGrade]
  );
  const absent = useMemo<Enrolled[] | null>(() => {
    if (!data?.enrolled) return null;
    const took = new Set(attempts.map((a) => a.studentId));
    return data.enrolled.filter((e) => !took.has(e.id)).sort((a, b) => compareText(surnameFirst(a.name), surnameFirst(b.name)));
  }, [data, attempts]);
  const toWatch = useMemo(() => anomalies(attempts, t), [attempts, t]);

  const close = async () => {
    if (!s) return;
    const ok = await confirm({
      title: t('admin.closeTitle', { target: targetLabel(s) }),
      message: s.live > 0 ? t('admin.closeBodyLive', { n: s.live }) : t('admin.closeBody'),
      confirmLabel: t('admin.closeNow'),
      cancelLabel: t('common.cancel'),
      danger: true,
    });
    if (!ok) return;
    const res = await teacherApi.closeSession(s.id);
    if (res.ok) void load();
    else toast(res.error ?? t('errors.network'), 'error');
  };

  const extend = async () => {
    if (!s) return;
    const res = await teacherApi.extendSession(s.id, 15);
    if (res.ok) void load();
    else toast(res.error ?? t('errors.network'), 'error');
  };

  const exportCsv = () => {
    if (!s) return;
    const header = [
      t('admin.csvName'), 'Email', t('admin.classLabel'), t('admin.stateCol'), t('admin.grade'), t('admin.correct'), t('admin.total'),
      t('admin.pageExits'), t('admin.secondsAway'), t('admin.fullscreenExits'), t('admin.warnings'), t('admin.startedAt'), t('admin.submittedAt'), t('admin.submitReason'),
    ];
    const rows: (string | number | null)[][] = sorted.map((a) => [
      surnameFirst(a.name), a.email, a.class, t(`admin.attempt_${a.state}`), a.state === 'consegnata' ? a.grade : null, a.correctCount, a.totalCount,
      a.awayEvents, Math.round(a.awayMs / 1000), a.fullscreenExits, a.warnings, fmtDateTime(a.startedAt), a.submittedAt ? fmtDateTime(a.submittedAt) : '',
      a.submitReason ? t(`admin.reason_${a.submitReason}`) : a.annulledReason ?? '',
    ]);
    for (const e of absent ?? []) rows.push([surnameFirst(e.name), e.email, s.class, t('admin.absent'), null, null, null, null, null, null, null, '', '', '']);
    const date = new Date(s.createdAt).toLocaleDateString('sv-SE');
    downloadCsv(`verifica_${safeFileName(targetLabel(s))}_${safeFileName(s.examId)}_${date}.csv`, buildCsv(header, rows));
  };

  return (
    <>
      <div className="card">
        <div className="tab-head">
          <div style={{ minWidth: 0 }}>
            <button type="button" className="link-button" onClick={onBack}>
              <ArrowLeft size={15} aria-hidden /> {t('admin.historyTitle')}
            </button>
            <h2 className="tab-title" style={{ marginTop: '0.35rem' }}>
              {s ? `${targetLabel(s)} · ${examLabel(s.exam, s.examId, t)}` : t('common.loading')}
            </h2>
            {s && (
              <div className="hint tab-lead">
                <SessionStateChip s={s} /> {fmtDate(s.createdAt)} · {t('admin.assignedAt', { time: fmtTime(s.createdAt) })}
                {s.openUntil
                  ? ` · ${s.state === 'open' ? t('admin.openUntil', { time: fmtTime(s.openUntil), left: fmtDuration(Date.parse(s.openUntil) - now) }) : t('admin.windowWas', { time: fmtTime(s.openUntil) })}`
                  : s.state === 'open'
                    ? ` · ${t('admin.openNoLimit')}`
                    : ''}
                {s.durationMin ? ` · ${s.durationMin} min` : ''}
                {s.reopenedAt ? ` · ${t('admin.reopenedAt', { date: fmtDateTime(s.reopenedAt) })}` : ''}
                {s.createdBy ? ` · ${s.createdBy}` : ''}
              </div>
            )}
          </div>
          <div className="tab-actions">
            {s && s.state === 'open' && s.openUntil && (
              <button className="btn btn-sm btn-ghost" type="button" onClick={() => void extend()}>
                <Plus size={14} /> 15 min
              </button>
            )}
            {s && s.state === 'open' && (
              <button className="btn btn-sm btn-ghost danger-text" type="button" onClick={() => void close()}>
                <X size={14} /> {t('admin.closeNow')}
              </button>
            )}
            {s && s.state !== 'open' && !s.missing && (
              <button className="btn btn-sm" type="button" onClick={() => setReopen(true)}>
                <RotateCcw size={14} /> {s.targetType === 'class' ? t('admin.reopenAbsent') : t('admin.reopen')}
              </button>
            )}
            <button className="btn btn-sm btn-ghost" type="button" onClick={exportCsv} disabled={!data}>
              <Download size={14} /> CSV
            </button>
            <button className="btn btn-sm btn-ghost" type="button" onClick={() => void load()} disabled={loading}>
              <RefreshCw size={14} /> {t('admin.refresh')}
            </button>
          </div>
        </div>
        {error && data && <p className="error-msg">{error}</p>}
      </div>

      {!data || !s ? (
        <div className="card">
          <LoadState t={t} error={error} onRetry={() => void load()} />
        </div>
      ) : (
        <>
          <StatTiles
            tiles={[
              { label: s.enrolled !== null ? t('admin.submittedOfEnrolled') : t('admin.submittedCount'), value: s.enrolled !== null ? `${stats.n}/${s.enrolled}` : String(stats.n) },
              { label: t('admin.average'), value: fmtGrade(stats.mean), tone: 'good' },
              { label: t('admin.median'), value: fmtGrade(stats.median) },
              { label: t('admin.minMax'), value: stats.n ? `${fmtGrade(stats.min)}–${fmtGrade(stats.max)}` : '—', small: true },
              { label: stats.n ? t('admin.passedPct', { pct: Math.round((stats.passed / stats.n) * 100) }) : t('admin.passedCol'), value: String(stats.passed) },
              { label: t('admin.failed'), value: String(stats.failed), tone: stats.failed > 0 ? 'warn' : undefined },
              ...(absent ? [{ label: t('admin.absentCount'), value: String(absent.length), tone: absent.length > 0 ? ('bad' as const) : undefined }] : []),
              ...(s.live > 0 ? [{ label: t('admin.liveCount'), value: String(s.live), tone: 'warn' as const }] : []),
              ...(s.annulled > 0 ? [{ label: t('admin.annulledCount'), value: String(s.annulled), tone: 'bad' as const }] : []),
            ]}
          />

          {stats.n > 0 && (
            <div className="card">
              <h3 className="section-h" style={{ marginTop: 0 }}>{t('admin.distribution')}</h3>
              <p className="hint" style={{ marginTop: 0 }}>{t('admin.distributionLead')}</p>
              <Histogram stats={stats} />
            </div>
          )}

          <div className="card">
            <h3 className="section-h" style={{ marginTop: 0 }}>{t('admin.studentsN', { n: attempts.length })}</h3>
            <p className="hint" style={{ marginTop: 0 }}>{t('admin.rowHint')}</p>
            {attempts.length === 0 ? (
              <p className="hint">{t('admin.noAttempts')}</p>
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
                    {sorted.map((a) => {
                      const d = durationMs(a);
                      return (
                        <tr
                          key={a.id}
                          className="row-link"
                          tabIndex={0}
                          role="button"
                          aria-label={t('admin.openAttemptOf', { name: surnameFirst(a.name) })}
                          onClick={() => setOpenAttempt(a.id)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              setOpenAttempt(a.id);
                            }
                          }}
                        >
                          <td>
                            {surnameFirst(a.name)}
                            <div className="hint" style={{ fontSize: '0.72rem' }}>{a.email}</div>
                          </td>
                          <td>
                            <AttemptStateChip a={a} />
                          </td>
                          <td>
                            <GradeCell a={a} />
                          </td>
                          <td className="mono">
                            {a.correctCount}/{a.totalCount}
                          </td>
                          <td style={{ whiteSpace: 'nowrap' }}>{d !== null ? fmtDuration(d) : '—'}</td>
                          <td>
                            <DistractionCell a={a} />
                          </td>
                          <td style={{ whiteSpace: 'nowrap' }}>
                            {a.submittedAt ? fmtTime(a.submittedAt) : '—'}
                            {a.submitReason && a.submitReason !== 'volontaria' && (
                              <div className="hint" style={{ fontSize: '0.72rem' }}>{t(`admin.reason_${a.submitReason}`)}</div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {data.analysis.length > 0 && (
            <div className="card">
              <h3 className="section-h" style={{ marginTop: 0 }}>{t('admin.analysisTitle')}</h3>
              <p className="hint" style={{ marginTop: 0 }}>{t('admin.analysisLead')}</p>
              <div className="table-wrap">
                <table className="result-table" style={{ marginBottom: 0 }}>
                  <thead>
                    <tr>
                      <th>{t('admin.exerciseType')}</th>
                      <th>{t('admin.success')}</th>
                      <th>{t('admin.correct')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.analysis.map((c) => {
                      const pct = c.points > 0 ? Math.round((c.earned / c.points) * 100) : 0;
                      return (
                        <tr key={c.key}>
                          <td>{categoryLabel(c, t)}</td>
                          <td>
                            <span className="rate">
                              <span className="rate-track">
                                <span className={`rate-fill${pct < 40 ? ' bad' : pct < 60 ? ' warn' : ''}`} style={{ width: `${pct}%` }} />
                              </span>
                              <span className="rate-text">{pct}%</span>
                            </span>
                          </td>
                          <td className="mono">
                            {c.correct}/{c.total}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="two-cols">
            <div className="card" style={{ marginBottom: 0 }}>
              <h3 className="section-h" style={{ marginTop: 0 }}>
                {t('admin.absentTitle')}
                {absent ? ` (${absent.length})` : ''}
              </h3>
              {!absent ? (
                <p className="hint">{t('admin.absentUnknown')}</p>
              ) : absent.length === 0 ? (
                <p className="hint">{t('admin.absentNone')}</p>
              ) : (
                <>
                  <ul className="plain-list">
                    {absent.map((e) => (
                      <li key={e.id}>
                        {surnameFirst(e.name)} <span className="hint">· {e.email}</span>
                      </li>
                    ))}
                  </ul>
                  {s.state !== 'open' && s.targetType === 'class' && (
                    <button className="btn btn-sm" type="button" onClick={() => setReopen(true)} style={{ marginTop: '0.75rem' }}>
                      <RotateCcw size={14} /> {t('admin.reopenAbsent')}
                    </button>
                  )}
                </>
              )}
            </div>
            <div className="card" style={{ marginBottom: 0 }}>
              <h3 className="section-h" style={{ marginTop: 0 }}>{t('admin.toWatch', { n: toWatch.length })}</h3>
              {toWatch.length === 0 ? (
                <p className="hint">{t('admin.toWatchNone')}</p>
              ) : (
                <ul className="plain-list">
                  {toWatch.map(({ a, why }) => (
                    <li key={a.id}>
                      <button type="button" className="link-button" onClick={() => setOpenAttempt(a.id)}>
                        {surnameFirst(a.name)}
                      </button>{' '}
                      — {why.join(' · ')}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </>
      )}

      {openAttempt && <AttemptModal attemptId={openAttempt} onClose={() => setOpenAttempt(null)} onDeleted={() => void load()} />}
      {reopen && s && (
        <ReopenModal
          session={s}
          absent={absent}
          onClose={() => setReopen(false)}
          onDone={() => {
            setReopen(false);
            void load();
          }}
        />
      )}
    </>
  );
}

/** Istogramma a colonne: consegne per voto in decimi, con la soglia della sufficienza. */
function Histogram({ stats }: { stats: GradeStats }) {
  const { t } = useI18n();
  const [hover, setHover] = useState<string | null>(null);
  const max = Math.max(...stats.bins.map((b) => b.n), 1);
  const firstPass = stats.bins.findIndex((b) => b.pass);
  const active = stats.bins.find((b) => b.label === hover);
  const description = stats.bins
    .filter((b) => b.n > 0)
    .map((b) => `${b.n} · ${b.label}`)
    .join(', ');
  return (
    <div className="histogram" role="img" aria-label={t('admin.histogramAria', { list: description })}>
      <div className="histogram-hint" aria-hidden>
        {active ? t('admin.histogramBar', { grade: active.label, n: active.n, pct: Math.round((active.n / stats.n) * 100) }) : t('admin.histogramHover')}
      </div>
      <div className="histogram-area">
        {stats.bins.map((b, i) => (
          <div key={b.label} className={`histogram-col${i === firstPass ? ' threshold' : ''}`} onMouseEnter={() => setHover(b.label)} onMouseLeave={() => setHover(null)}>
            <span className="histogram-value">{b.n > 0 ? b.n : ''}</span>
            <span className={`histogram-bar${b.pass ? '' : ' fail'}`} style={{ height: `${(b.n / max) * 100}%` }} />
          </div>
        ))}
      </div>
      <div className="histogram-axis" aria-hidden>
        {stats.bins.map((b, i) => (
          <span key={b.label} className={i === firstPass ? 'threshold' : undefined}>
            {b.label}
          </span>
        ))}
      </div>
    </div>
  );
}

/**
 * Riapre la verifica: per la classe è il recupero, e la possono iniziare
 * solo gli assenti (chi ha già una prova non ne inizia un'altra).
 */
function ReopenModal({
  session,
  absent,
  onClose,
  onDone,
}: {
  session: SessionDetail['session'];
  absent: Enrolled[] | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const { t } = useI18n();
  const toast = useToast();
  const [windowMin, setWindowMin] = useState<number | 'none'>(DEFAULT_WINDOW_MIN);
  const [busy, setBusy] = useState(false);
  const until = windowMin === 'none' ? null : new Date(Date.now() + windowMin * 60_000).toISOString();

  const submit = async () => {
    setBusy(true);
    const res = await teacherApi.reopenSession(session.id, windowMin === 'none' ? null : windowMin);
    setBusy(false);
    if (res.ok && res.data) {
      toast(t('admin.reopenedOk', { target: targetLabel(session) }), 'success');
      if (res.data.closedPrevious > 0) toast(t('admin.closedPrevious', { target: targetLabel(session) }), 'info');
      onDone();
    } else toast(res.error ?? t('errors.network'), 'error');
  };

  return (
    <Modal title={session.targetType === 'class' ? t('admin.reopenAbsentTitle', { target: session.class }) : t('admin.reopenTitle', { target: targetLabel(session) })} onClose={onClose} size="sm">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        {session.targetType === 'class' && (
          <p className="hint" style={{ marginTop: 0 }}>
            {absent === null
              ? t('admin.reopenWhoUnknown')
              : absent.length === 0
                ? t('admin.reopenWhoNone')
                : t('admin.reopenWho', { n: absent.length, list: absent.map((e) => surnameFirst(e.name)).join(', ') })}
          </p>
        )}
        <div className="field">
          <label htmlFor="reopen-window">{t('admin.stepWindow')}</label>
          <select id="reopen-window" value={String(windowMin)} onChange={(e) => setWindowMin(e.target.value === 'none' ? 'none' : Number(e.target.value))}>
            {WINDOW_OPTIONS_MIN.map((m) => (
              <option key={m} value={m}>
                {fmtWindow(m)}
              </option>
            ))}
            <option value="none">{t('admin.windowNone')}</option>
          </select>
        </div>
        <div className="assign-summary">
          {until ? t('admin.reopenSummary', { time: fmtTime(until), n: session.durationMin ?? 30 }) : t('admin.reopenSummaryNoWindow', { n: session.durationMin ?? 30 })}
        </div>
        <div className="actions">
          <button className="btn" type="submit" disabled={busy}>
            <RotateCcw size={15} /> {busy ? t('common.loading') : t('admin.reopenConfirm')}
          </button>
          <button className="btn btn-secondary" type="button" onClick={onClose} style={{ marginLeft: 'auto' }}>
            {t('common.cancel')}
          </button>
        </div>
      </form>
    </Modal>
  );
}
