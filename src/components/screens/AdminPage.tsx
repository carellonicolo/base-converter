import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Users, LogIn, Download, Radio, Eye, RefreshCw, ClipboardList, BookOpen, Send, X } from 'lucide-react';
import { AppShell } from '../ui/AppShell';
import { LoadState } from '../ui/LoadState';
import { useI18n } from '../../i18n';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../ui/Toast';
import { useConfirm } from '../ui/Confirm';
import { authFetch } from '../../lib/auth';
import { fmtGrade, fmtDateTime, fmtClock } from '../../lib/format';
import { moduleLabel, examTitle, exercisePrompt, expectedHint } from '../../lib/exerciseText';
import type { Exercise } from '../../../shared/exercises/generator';
import type { TopicKey, Level } from '../../../shared/exam/catalog';

type Tab = 'exams' | 'assignments' | 'results' | 'live';
type Tfn = (k: string, v?: Record<string, string | number>) => string;

interface ExamRow {
  id: string;
  topic: TopicKey;
  level: Level;
  modules: string[];
  difficulty: string;
  questionCount: number;
  durationMin: number;
  passGrade: number;
}

interface AssignmentRow {
  id: string;
  examId: string;
  class: string;
  status: 'open' | 'closed';
  durationMin: number | null;
  createdBy: string;
  createdAt: string;
  attempts: number;
  submitted: number;
  live: number;
  exam: { topic: TopicKey; level: Level; questionCount: number; durationMin: number } | null;
  missing: boolean;
}

interface ResultRow {
  id: string;
  name: string;
  email: string;
  class: string | null;
  examTopic: TopicKey | null;
  examLevel: Level | null;
  grade: number | null;
  correct_count: number;
  total_count: number;
  away_events: number;
  submitted_at: string | null;
}

interface LiveRow {
  id: string;
  name: string;
  email: string;
  class: string | null;
  examTopic: TopicKey | null;
  examLevel: Level | null;
  away_events: number;
  remainingMs: number;
}

export function AdminPage() {
  const { t } = useI18n();
  const { user, loading, isTeacher, login } = useAuth();
  const [tab, setTab] = useState<Tab>('exams');

  const back = (
    <div className="breadcrumb">
      <Link to="/">
        <ArrowLeft size={14} style={{ verticalAlign: '-2px' }} /> {t('common.home')}
      </Link>
    </div>
  );

  if (loading) {
    return (
      <AppShell back={back}>
        <div className="card" style={{ maxWidth: 520, margin: '2rem auto' }}>{t('common.loading')}</div>
      </AppShell>
    );
  }

  if (!user) {
    return (
      <AppShell back={back}>
        <div className="gate">
          <div className="landing-hero-icon" aria-hidden>
            <Users size={30} />
          </div>
          <h1 style={{ fontSize: '1.4rem' }}>{t('auth.loginNeeded')}</h1>
          <button className="btn" type="button" onClick={login} style={{ marginTop: '1rem' }}>
            <LogIn size={16} /> {t('auth.goLogin')}
          </button>
        </div>
      </AppShell>
    );
  }

  if (!isTeacher) {
    return (
      <AppShell back={back}>
        <div className="card" style={{ maxWidth: 520, margin: '2rem auto' }}>
          <h2 style={{ marginTop: 0 }}>{t('admin.teacherOnly')}</h2>
        </div>
      </AppShell>
    );
  }

  const tabs: [Tab, string][] = [
    ['exams', t('admin.tabExams')],
    ['assignments', t('admin.tabAssignments')],
    ['results', t('admin.tabResults')],
    ['live', t('admin.tabLive')],
  ];

  return (
    <AppShell back={back}>
      <div className="module module-wide">
        <div className="module-head">
          <h1>
            <span className="module-head-icon" aria-hidden>
              <Users size={24} />
            </span>
            {t('admin.title')}
          </h1>
        </div>

        <div className="admin-tabs">
          {tabs.map(([key, label]) => (
            <button
              key={key}
              className={`btn btn-sm ${tab === key ? '' : 'btn-secondary'}`}
              onClick={() => setTab(key)}
              type="button"
            >
              {label}
            </button>
          ))}
        </div>

        {tab === 'exams' && <ExamsTab t={t} />}
        {tab === 'assignments' && <AssignmentsTab t={t} />}
        {tab === 'results' && <ResultsTab t={t} />}
        {tab === 'live' && <LiveTab t={t} />}
      </div>
    </AppShell>
  );
}

/* ============================ Pool / catalogo ============================ */

const TOPIC_ORDER: TopicKey[] = ['binary', 'hex', 'mixed', 'arith', 'float', 'signed', 'twos'];

function ExamsTab({ t }: { t: Tfn }) {
  const [exams, setExams] = useState<ExamRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [assignFor, setAssignFor] = useState<ExamRow | null>(null);

  useEffect(() => {
    let alive = true;
    void (async () => {
      setError(null);
      const res = await authFetch<{ exams: ExamRow[] }>('/api/teacher/exams');
      if (!alive) return;
      if (res.ok && res.data) setExams(res.data.exams);
      else setError(res.error ?? `HTTP ${res.status}`);
    })();
    return () => {
      alive = false;
    };
  }, [reload]);

  const byTopic = useMemo(() => {
    const map = new Map<TopicKey, ExamRow[]>();
    for (const e of exams ?? []) {
      const arr = map.get(e.topic) ?? [];
      arr.push(e);
      map.set(e.topic, arr);
    }
    for (const arr of map.values()) arr.sort((a, b) => a.level - b.level);
    return map;
  }, [exams]);

  if (!exams || error) {
    return (
      <div className="card">
        <LoadState t={t} error={error} onRetry={() => setReload((n) => n + 1)} />
      </div>
    );
  }

  return (
    <>
      <p className="hint" style={{ marginTop: 0 }}>{t('admin.poolLead')}</p>
      {TOPIC_ORDER.filter((topic) => byTopic.has(topic)).map((topic) => (
        <div className="card" key={topic}>
          <h2 style={{ marginTop: 0, fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: 8 }}>
            <BookOpen size={18} /> {t(`topic.${topic}`)}
          </h2>
          <div className="exam-pool">
            {(byTopic.get(topic) ?? []).map((e) => (
              <div className="exam-pool-row" key={e.id}>
                <div className="exam-pool-info">
                  <span className="chip primary">{t(`level.short${e.level}`)}</span>
                  <span className="exam-pool-meta">
                    {e.questionCount} {t('admin.questionsShort')} · {e.durationMin} {t('admin.minutes')}
                  </span>
                </div>
                <div className="row" style={{ gap: '0.4rem' }}>
                  <button className="btn btn-sm btn-secondary" type="button" onClick={() => setPreviewId(e.id)}>
                    <Eye size={14} /> {t('admin.preview')}
                  </button>
                  <button className="btn btn-sm" type="button" onClick={() => setAssignFor(e)}>
                    <Send size={14} /> {t('admin.assign')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {previewId && <PreviewModal t={t} examId={previewId} onClose={() => setPreviewId(null)} />}
      {assignFor && (
        <AssignModal
          t={t}
          exam={assignFor}
          onClose={() => setAssignFor(null)}
        />
      )}
    </>
  );
}

interface PreviewQuestion {
  index: number;
  module: string;
  kind: string;
  params: Record<string, string | number>;
  points: number;
  answer: string;
}

function asExercise(q: PreviewQuestion): Exercise {
  return {
    id: `q${q.index}`,
    module: q.module as Exercise['module'],
    kind: q.kind as Exercise['kind'],
    difficulty: 'medium',
    params: q.params,
    answer: q.answer,
    points: q.points,
  };
}

function PreviewModal({ t, examId, onClose }: { t: Tfn; examId: string; onClose: () => void }) {
  const [data, setData] = useState<{ exam: ExamRow; questions: PreviewQuestion[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [seed, setSeed] = useState<number | null>(null);

  const load = useCallback(async () => {
    setError(null);
    const q = seed ? `&seed=${seed}` : '';
    const res = await authFetch<{ exam: ExamRow; questions: PreviewQuestion[] }>(`/api/teacher/exams?id=${encodeURIComponent(examId)}${q}`);
    if (res.ok && res.data) setData(res.data);
    else setError(res.error ?? `HTTP ${res.status}`);
  }, [examId, seed]);

  useEffect(() => {
    void load();
  }, [load]);

  // Un nuovo seed pseudo-casuale per rigenerare gli esempi mostrati.
  const reshuffle = () => setSeed((Date.now() % 2_000_000_000) + 1);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>
            {data ? examTitle(data.exam.topic, data.exam.level, t) : t('admin.previewTitle')}
          </h2>
          <button className="icon-btn" type="button" onClick={onClose} aria-label={t('common.close')}>
            <X size={18} />
          </button>
        </div>
        <div className="modal-body">
          {!data || error ? (
            <LoadState t={t} error={error} onRetry={() => void load()} />
          ) : (
            <>
              <div className="row row-wrap" style={{ justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <span className="hint">
                  {data.exam.questionCount} {t('admin.questionsShort')} · {data.exam.durationMin} {t('admin.minutes')}
                </span>
                <button className="btn btn-sm btn-ghost" type="button" onClick={reshuffle}>
                  <RefreshCw size={14} /> {t('admin.reshuffle')}
                </button>
              </div>
              <div className="table-scroll">
                <table className="result-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>{t('dash.module')}</th>
                      <th>{t('exam.title')}</th>
                      <th>{t('admin.answerCol')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.questions.map((q) => (
                      <tr key={q.index}>
                        <td>{q.index + 1}</td>
                        <td>{moduleLabel(q.module, t)}</td>
                        <td>{exercisePrompt(asExercise(q), t)}</td>
                        <td className="mono">
                          {q.answer} <span className="hint">{expectedHint(asExercise(q))}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function AssignModal({ t, exam, onClose }: { t: Tfn; exam: ExamRow; onClose: () => void }) {
  const toast = useToast();
  const [classes, setClasses] = useState<string[] | null>(null);
  const [cls, setCls] = useState('');
  const [duration, setDuration] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let alive = true;
    void (async () => {
      const res = await authFetch<{ classes: string[] }>('/api/teacher/classes');
      if (!alive) return;
      setClasses(res.ok && res.data ? res.data.classes : []);
    })();
    return () => {
      alive = false;
    };
  }, []);

  const submit = async () => {
    const chosen = cls.trim();
    if (!chosen) {
      toast(t('admin.chooseClass'), 'error');
      return;
    }
    setSaving(true);
    const res = await authFetch<{ ok: boolean; closedPrevious: number }>('/api/teacher/assignments', {
      method: 'POST',
      body: JSON.stringify({
        examId: exam.id,
        class: chosen,
        durationMin: duration.trim() === '' ? null : Number(duration),
      }),
    });
    setSaving(false);
    if (res.ok) {
      toast(t('admin.assignedOk', { class: chosen }), 'success');
      if (res.data && res.data.closedPrevious > 0) toast(t('admin.closedPrevious', { class: chosen }), 'info');
      onClose();
    } else {
      toast(res.error ?? t('errors.network'), 'error');
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal modal-sm" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>{t('admin.assignTitle', { exam: examTitle(exam.topic, exam.level, t) })}</h2>
          <button className="icon-btn" type="button" onClick={onClose} aria-label={t('common.close')}>
            <X size={18} />
          </button>
        </div>
        <div className="modal-body">
          <div className="field">
            <label htmlFor="assign-class">{t('admin.chooseClass')}</label>
            {classes === null ? (
              <p className="hint">{t('admin.classesLoading')}</p>
            ) : (
              <>
                {classes.length > 0 ? (
                  <select id="assign-class" value={cls} onChange={(e) => setCls(e.target.value)}>
                    <option value="">—</option>
                    {classes.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="hint">{t('admin.noClasses')}</p>
                )}
                <label htmlFor="assign-class-manual" style={{ marginTop: 10 }}>
                  {t('admin.classManual')}
                </label>
                <input
                  id="assign-class-manual"
                  value={cls}
                  onChange={(e) => setCls(e.target.value)}
                  placeholder="es. 3A"
                />
              </>
            )}
          </div>
          <div className="field">
            <label htmlFor="assign-duration">{t('admin.durationOverride', { n: exam.durationMin })}</label>
            <input
              id="assign-duration"
              type="number"
              min={1}
              max={240}
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              placeholder={String(exam.durationMin)}
            />
          </div>
          <button className="btn" type="button" onClick={submit} disabled={saving}>
            <Send size={16} /> {saving ? t('common.loading') : t('admin.confirmAssign')}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ============================ Assegnazioni ============================ */

function AssignmentsTab({ t }: { t: Tfn }) {
  const toast = useToast();
  const confirm = useConfirm();
  const [rows, setRows] = useState<AssignmentRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let alive = true;
    void (async () => {
      setError(null);
      const res = await authFetch<{ assignments: AssignmentRow[] }>('/api/teacher/assignments');
      if (!alive) return;
      if (res.ok && res.data) setRows(res.data.assignments);
      else setError(res.error ?? `HTTP ${res.status}`);
    })();
    return () => {
      alive = false;
    };
  }, [reload]);

  const toggle = async (a: AssignmentRow) => {
    const next = a.status === 'open' ? 'closed' : 'open';
    const ok = await confirm({
      message: next === 'closed' ? t('admin.confirmClose') : t('admin.confirmReopen'),
      confirmLabel: next === 'closed' ? t('admin.close') : t('admin.open'),
      danger: next === 'closed',
    });
    if (!ok) return;
    const res = await authFetch('/api/teacher/assignments', {
      method: 'PATCH',
      body: JSON.stringify({ id: a.id, status: next }),
    });
    if (res.ok) setReload((n) => n + 1);
    else toast(res.error ?? t('errors.network'), 'error');
  };

  if (!rows || error) {
    return (
      <div className="card">
        <LoadState t={t} error={error} onRetry={() => setReload((n) => n + 1)} />
      </div>
    );
  }

  return (
    <div className="card">
      <p className="hint" style={{ marginTop: 0 }}>{t('admin.assignmentsLead')}</p>
      {rows.length === 0 ? (
        <p className="hint">{t('admin.noAssignments')}</p>
      ) : (
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>{t('admin.exam')}</th>
                <th>{t('admin.classLabel')}</th>
                <th>{t('common.check')}</th>
                <th>{t('admin.liveCount')}</th>
                <th>{t('admin.submittedCount')}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((a) => (
                <tr key={a.id}>
                  <td>
                    {a.exam ? (
                      examTitle(a.exam.topic, a.exam.level, t)
                    ) : (
                      <span className="hint">{a.examId} · {t('admin.staleExam')}</span>
                    )}
                    <br />
                    <span className="hint">{t('admin.createdBy')}: {a.createdBy || '—'}</span>
                  </td>
                  <td><ClipboardList size={13} style={{ verticalAlign: '-2px' }} /> {a.class}</td>
                  <td>
                    <span className={`chip ${a.status === 'open' ? 'primary' : ''}`}>
                      {a.status === 'open' ? t('admin.statusOpen') : t('admin.statusClosed')}
                    </span>
                  </td>
                  <td className="mono">{a.live}</td>
                  <td className="mono">{a.submitted}</td>
                  <td>
                    <button
                      className={`btn btn-sm ${a.status === 'open' ? 'btn-ghost' : 'btn-secondary'}`}
                      type="button"
                      onClick={() => toggle(a)}
                    >
                      {a.status === 'open' ? t('admin.close') : t('admin.open')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ============================ Risultati ============================ */

function ResultsTab({ t }: { t: Tfn }) {
  const [rows, setRows] = useState<ResultRow[] | null>(null);
  const [cls, setCls] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let alive = true;
    const timer = setTimeout(() => {
      void (async () => {
        setError(null);
        const res = await authFetch<{ results: ResultRow[] }>(
          `/api/teacher/results${cls ? `?class=${encodeURIComponent(cls)}` : ''}`
        );
        if (!alive) return;
        if (res.ok && res.data) setRows(res.data.results);
        else setError(res.error ?? `HTTP ${res.status}`);
      })();
    }, 300);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [cls, reload]);

  return (
    <div className="card">
      <div className="row row-wrap" style={{ justifyContent: 'space-between', marginBottom: '1rem' }}>
        <input value={cls} onChange={(e) => setCls(e.target.value)} placeholder={t('admin.classLabel')} style={{ maxWidth: 200 }} />
        <a className="btn btn-sm btn-secondary" href={`/api/teacher/results?format=csv${cls ? `&class=${encodeURIComponent(cls)}` : ''}`}>
          <Download size={15} /> {t('admin.exportCsv')}
        </a>
      </div>

      {!rows || error ? (
        <LoadState t={t} error={error} onRetry={() => setReload((n) => n + 1)} />
      ) : rows.length === 0 ? (
        <p className="hint">{t('admin.noResults')}</p>
      ) : (
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>{t('admin.student')}</th>
                <th>{t('admin.classLabel')}</th>
                <th>{t('admin.exam')}</th>
                <th>{t('admin.grade')}</th>
                <th>{t('exam.reviewTitle')}</th>
                <th>{t('admin.awayEvents')}</th>
                <th>{t('admin.when')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>
                    {r.name}
                    <br />
                    <span className="hint">{r.email}</span>
                  </td>
                  <td>{r.class ?? '—'}</td>
                  <td>{r.examTopic && r.examLevel ? examTitle(r.examTopic, r.examLevel, t) : '—'}</td>
                  <td className="mono" style={{ fontWeight: 700, color: (r.grade ?? 0) >= 6 ? 'var(--success)' : 'var(--error)' }}>
                    {fmtGrade(r.grade)}
                  </td>
                  <td className="mono">
                    {r.correct_count}/{r.total_count}
                  </td>
                  <td className="mono" style={{ color: r.away_events > 0 ? 'var(--error)' : undefined }}>
                    {r.away_events}
                  </td>
                  <td>{fmtDateTime(r.submitted_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ============================ In diretta ============================ */

function LiveTab({ t }: { t: Tfn }) {
  const [rows, setRows] = useState<LiveRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      const res = await authFetch<{ live: LiveRow[] }>('/api/teacher/live');
      if (!alive) return;
      if (res.ok && res.data) {
        setRows(res.data.live);
        setError(null);
      } else {
        setError(res.error ?? `HTTP ${res.status}`);
      }
    };
    void load();
    const id = setInterval(load, 15_000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [reload]);

  return (
    <div className="card">
      <div className="row" style={{ marginBottom: '1rem' }}>
        <Radio size={18} color="var(--primary)" />
        <strong>{t('admin.onlineNow')}</strong>
        <span className="hint">(aggiornamento ogni 15 s)</span>
      </div>
      {rows && error && (
        <p className="hint" style={{ color: 'var(--error)' }}>
          {t('errors.loadFailed')} — {error}
        </p>
      )}
      {!rows ? (
        <LoadState t={t} error={error} onRetry={() => setReload((n) => n + 1)} />
      ) : rows.length === 0 ? (
        <p className="hint">{t('admin.noResults')}</p>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>{t('admin.student')}</th>
              <th>{t('admin.classLabel')}</th>
              <th>{t('admin.exam')}</th>
              <th>{t('exam.timeLeft')}</th>
              <th>{t('admin.awayEvents')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>
                  {r.name}
                  <br />
                  <span className="hint">{r.email}</span>
                </td>
                <td>{r.class ?? '—'}</td>
                <td>{r.examTopic && r.examLevel ? examTitle(r.examTopic, r.examLevel, t) : '—'}</td>
                <td className="mono">{fmtClock(r.remainingMs)}</td>
                <td className="mono" style={{ color: r.away_events > 0 ? 'var(--error)' : undefined }}>
                  <Eye size={14} style={{ verticalAlign: '-2px' }} /> {r.away_events}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
