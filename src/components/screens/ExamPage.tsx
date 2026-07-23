import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ClipboardCheck, LogIn, Timer, Eye, TriangleAlert } from 'lucide-react';
import { AppShell } from '../ui/AppShell';
import { useI18n } from '../../i18n';
import { useAuth } from '../../hooks/useAuth';
import { useConfirm } from '../ui/Confirm';
import { useToast } from '../ui/Toast';
import { useFocusMonitor } from '../../hooks/useFocusMonitor';
import { authFetch } from '../../lib/auth';
import { fmtClock, fmtGrade } from '../../lib/format';
import { exercisePrompt, expectedHint, moduleLabel, examTitle } from '../../lib/exerciseText';
import type { Exercise } from '../../../shared/exercises/generator';

/** Domanda inviata dal server: SENZA la risposta attesa. */
interface Question {
  index: number;
  module: string;
  kind: string;
  params: Record<string, string | number>;
  points: number;
}

interface ExamMeta {
  id: string;
  topic: string;
  level: number;
  modules: string[];
}

interface ExamState {
  user: { name: string; email: string; class: string | null; isTeacher: boolean };
  /** Esiste un'assegnazione aperta per la classe dello studente. */
  assigned: boolean;
  /** La verifica assegnata non è più nel catalogo (edge case). */
  staleExam?: boolean;
  exam?: ExamMeta;
  config?: { durationMin: number; questionCount: number; modules: string[]; difficulty: string; passGrade: number };
  current: null | {
    id: string;
    startedAt: string;
    deadline: string;
    questions: Question[];
    answers: string[];
  };
  /** Verifica già consegnata: si mostra l'esito, non si ripete. */
  submitted: null | { grade: number | null; correctCount: number; totalCount: number };
}

interface Outcome {
  grade: number;
  correctCount: number;
  totalCount: number;
  passed: boolean;
  late: boolean;
  questions: {
    index: number;
    module: string;
    kind: string;
    params: Record<string, string | number>;
    given: string;
    expected: string;
    correct: boolean;
  }[];
}

/** Adatta una Question del server al tipo Exercise per riusare il renderer. */
function asExercise(q: Question): Exercise {
  return {
    id: `q${q.index}`,
    module: q.module as Exercise['module'],
    kind: q.kind as Exercise['kind'],
    difficulty: 'medium',
    params: q.params,
    answer: '',
    points: q.points,
  };
}

export function ExamPage() {
  const { t } = useI18n();
  const { user, loading, login } = useAuth();
  const confirm = useConfirm();
  const toast = useToast();

  const [state, setState] = useState<ExamState | null>(null);
  const [error, setError] = useState<{ message: string; code?: string } | null>(null);
  const [questions, setQuestions] = useState<Question[] | null>(null);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [deadline, setDeadline] = useState<number | null>(null);
  const [answers, setAnswers] = useState<string[]>([]);
  const [now, setNow] = useState(Date.now());
  const [submitting, setSubmitting] = useState(false);
  const [outcome, setOutcome] = useState<Outcome | null>(null);

  // Focus monitor: conteggio uscite dalla pagina durante la prova.
  const [awayEvents, setAwayEvents] = useState(0);
  const awayMsRef = useRef(0);
  const running = !!attemptId && !outcome;

  useFocusMonitor(running, (e) => {
    awayMsRef.current += e.durataMs;
    setAwayEvents((n) => n + 1);
  });

  /* ---- caricamento stato ---- */
  useEffect(() => {
    if (!user) return;
    let alive = true;
    void (async () => {
      const res = await authFetch<ExamState>('/api/exam/state');
      if (!alive) return;
      if (res.ok && res.data) {
        setState(res.data);
        setError(null);
        if (res.data.current) {
          setAttemptId(res.data.current.id);
          setQuestions(res.data.current.questions);
          setDeadline(new Date(res.data.current.deadline).getTime());
          setAnswers(padAnswers(res.data.current.answers, res.data.current.questions.length));
        }
      } else {
        setError({ message: res.error ?? 'Errore', code: res.code });
      }
    })();
    return () => {
      alive = false;
    };
  }, [user]);

  /* ---- timer ---- */
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [running]);

  /* ---- heartbeat per la vista "in diretta" del docente ---- */
  useEffect(() => {
    if (!running) return;
    const send = () => {
      void authFetch('/api/exam/heartbeat', {
        method: 'POST',
        body: JSON.stringify({ awayEvents, awayMs: Math.round(awayMsRef.current) }),
      });
    };
    send();
    const id = setInterval(send, 30_000);
    return () => clearInterval(id);
  }, [running, awayEvents]);

  const remaining = deadline ? deadline - now : 0;

  const doSubmit = useCallback(
    async (auto = false) => {
      if (!attemptId || submitting) return;
      setSubmitting(true);
      const res = await authFetch<Outcome>('/api/exam/submit', {
        method: 'POST',
        body: JSON.stringify({
          id: attemptId,
          answers,
          awayEvents,
          awayMs: Math.round(awayMsRef.current),
        }),
      });
      setSubmitting(false);
      if (res.ok && res.data) {
        setOutcome(res.data);
        setAttemptId(null);
        if (auto) toast(t('exam.timeLeft') + ' 00:00', 'info');
      } else {
        toast(res.error ?? t('errors.network'), 'error');
      }
    },
    [attemptId, answers, awayEvents, submitting, t, toast]
  );

  /* ---- consegna automatica allo scadere ---- */
  useEffect(() => {
    if (running && deadline && now >= deadline) void doSubmit(true);
  }, [running, deadline, now, doSubmit]);

  const start = async () => {
    const res = await authFetch<{ id: string; questions: Question[]; config: { durationMin: number } }>('/api/exam/start', {
      method: 'POST',
    });
    if (res.ok && res.data) {
      setAttemptId(res.data.id);
      if (res.data.questions) {
        setQuestions(res.data.questions);
        setAnswers(new Array(res.data.questions.length).fill(''));
        setDeadline(Date.now() + (res.data.config?.durationMin ?? 30) * 60_000);
      } else {
        // Tentativo ripreso: ricarica lo stato completo.
        const st = await authFetch<ExamState>('/api/exam/state');
        if (st.ok && st.data?.current) {
          setQuestions(st.data.current.questions);
          setDeadline(new Date(st.data.current.deadline).getTime());
          setAnswers(padAnswers(st.data.current.answers, st.data.current.questions.length));
        }
      }
      setAwayEvents(0);
      awayMsRef.current = 0;
    } else {
      toast(res.error ?? t('errors.network'), 'error');
    }
  };

  const askSubmit = async () => {
    const ok = await confirm({ title: t('exam.submit'), message: t('exam.submitConfirm'), confirmLabel: t('exam.submit') });
    if (ok) void doSubmit(false);
  };

  const answeredCount = useMemo(() => answers.filter((a) => a.trim() !== '').length, [answers]);

  /* ---------- non loggato ---------- */
  if (!loading && !user) {
    return (
      <AppShell>
        <div className="gate">
          <div className="landing-hero-icon" aria-hidden>
            <ClipboardCheck size={30} />
          </div>
          <h1 style={{ fontSize: '1.4rem' }}>{t('auth.loginNeeded')}</h1>
          <p className="hint">{t('auth.loginNeededBody')}</p>
          <button className="btn" type="button" onClick={login} style={{ marginTop: '1rem' }}>
            <LogIn size={16} /> {t('auth.goLogin')}
          </button>
        </div>
      </AppShell>
    );
  }

  /* ---------- esito ---------- */
  if (outcome) {
    return (
      <AppShell>
        <div className="module">
          <div className="voto-box">
            <div className="voto-head">{t('exam.resultTitle')}</div>
            <p className="voto10">{fmtGrade(outcome.grade)}</p>
            <div className="voto-sub">
              {t('exam.outOf')} · {t('exam.correctCount', { ok: outcome.correctCount, tot: outcome.totalCount })}
            </div>
          </div>

          {outcome.late && (
            <div className="feedback ko" style={{ marginBottom: '1rem' }}>
              <TriangleAlert size={16} style={{ verticalAlign: '-3px' }} /> Consegna fuori tempo massimo.
            </div>
          )}

          <div className="card">
            <h2 style={{ marginTop: 0, fontSize: '1.05rem' }}>{t('exam.reviewTitle')}</h2>
            <div className="table-scroll">
              <table className="result-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>{t('dash.module')}</th>
                    <th>{t('exam.yourAnswer')}</th>
                    <th>{t('exam.expected')}</th>
                  </tr>
                </thead>
                <tbody>
                  {outcome.questions.map((q) => (
                    <tr key={q.index} className={q.correct ? 'cell-ok' : 'cell-ko'}>
                      <td>{q.index + 1}</td>
                      <td>{moduleLabel(q.module, t)}</td>
                      <td className="mono">{q.given || '—'}</td>
                      <td className="mono">{q.expected}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="hint" style={{ marginTop: '1rem' }}>{t('exam.theoryReminder')}</p>
          </div>
        </div>
      </AppShell>
    );
  }

  /* ---------- prova in corso ---------- */
  if (attemptId && questions) {
    const danger = remaining < 60_000;
    const warning = remaining < 5 * 60_000;
    return (
      <AppShell nav={false}>
        <div className="module">
          <div className="test-header-bar">
            <span className={`timer-badge${danger ? ' danger' : warning ? ' warning' : ''}`}>
              <Timer size={16} /> {fmtClock(Math.max(0, remaining))}
            </span>
            <div className="test-progress">
              <div className="test-progress-track">
                <div className="test-progress-fill" style={{ width: `${(answeredCount / questions.length) * 100}%` }} />
              </div>
              <span className="test-progress-label">
                {answeredCount}/{questions.length}
              </span>
            </div>
            <span className={`monitor-chip ${awayEvents === 0 ? 'zero' : 'warn'}`}>
              <Eye size={14} /> {awayEvents === 0 ? t('exam.monitorOk') : t('exam.monitorAway', { n: awayEvents })}
            </span>
            <button className="btn btn-sm" type="button" onClick={askSubmit} disabled={submitting}>
              {submitting ? t('exam.submitting') : t('exam.submit')}
            </button>
          </div>

          {awayEvents > 0 && (
            <div className="feedback ko" style={{ marginBottom: '1rem' }}>
              <TriangleAlert size={16} style={{ verticalAlign: '-3px' }} /> {t('exam.away')}
            </div>
          )}

          {questions.map((q, i) => (
            <div className="card" key={q.index}>
              <div className="row row-wrap" style={{ justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span className="chip primary">
                  {i + 1}. {moduleLabel(q.module, t)}
                </span>
                <span className="chip">
                  {q.points} {q.points === 1 ? 'punto' : 'punti'}
                </span>
              </div>
              <p className="exercise-prompt">{exercisePrompt(asExercise(q), t)}</p>
              <div className="answer-row">
                <input
                  className="mono"
                  value={answers[i] ?? ''}
                  onChange={(e) => {
                    const next = [...answers];
                    next[i] = e.target.value;
                    setAnswers(next);
                  }}
                  spellCheck={false}
                  autoComplete="off"
                  aria-label={`${t('gym.yourAnswer')} ${i + 1}`}
                />
                <span className="chip">{expectedHint(asExercise(q))}</span>
              </div>
            </div>
          ))}

          <div className="actions">
            <button className="btn" type="button" onClick={askSubmit} disabled={submitting}>
              {submitting ? t('exam.submitting') : t('exam.submit')}
            </button>
          </div>
        </div>
      </AppShell>
    );
  }

  /* ---------- schermata iniziale ---------- */
  const examName = state?.exam ? examTitle(state.exam.topic, state.exam.level, t) : null;
  return (
    <AppShell>
      <div className="module">
        <div className="module-head">
          <h1>
            <span className="module-head-icon" aria-hidden>
              <ClipboardCheck size={24} />
            </span>
            {t('exam.title')}
          </h1>
          <p>{t('exam.lead')}</p>
        </div>

        {error ? (
          <div className="card">
            <h2 style={{ marginTop: 0, fontSize: '1.05rem' }}>
              {error.code === 'pending' ? t('auth.pending') : t('exam.notAssignedTitle')}
            </h2>
            <p className="hint">{error.message}</p>
          </div>
        ) : !state ? (
          <div className="card">{t('common.loading')}</div>
        ) : state.submitted ? (
          <div className="card">
            <h2 style={{ marginTop: 0, fontSize: '1.05rem' }}>{t('exam.alreadyDoneTitle')}</h2>
            {examName && <span className="chip primary" style={{ marginBottom: '0.75rem' }}>{examName}</span>}
            <p className="hint">{t('exam.alreadyDoneBody')}</p>
            <div className="voto-box" style={{ marginTop: '0.5rem' }}>
              <p className="voto10">{fmtGrade(state.submitted.grade)}</p>
              <div className="voto-sub">
                {t('exam.correctCount', { ok: state.submitted.correctCount, tot: state.submitted.totalCount })}
              </div>
            </div>
          </div>
        ) : state.staleExam ? (
          <div className="card">
            <h2 style={{ marginTop: 0, fontSize: '1.05rem' }}>{t('exam.staleTitle')}</h2>
            <p className="hint">{t('exam.staleBody')}</p>
          </div>
        ) : !state.assigned || !state.config ? (
          <div className="card">
            <h2 style={{ marginTop: 0, fontSize: '1.05rem' }}>{t('exam.notAssignedTitle')}</h2>
            <p className="hint">{t('exam.notAssignedBody')}</p>
          </div>
        ) : (
          <div className="card">
            {examName && (
              <span className="chip primary" style={{ marginBottom: '1rem', display: 'inline-block' }}>
                {examName}
              </span>
            )}
            <div className="stat-grid">
              <div className="stat-tile">
                <div className="stat-value">{state.config.durationMin}</div>
                <div className="stat-label">{t('exam.minutes')}</div>
              </div>
              <div className="stat-tile">
                <div className="stat-value">{state.config.questionCount}</div>
                <div className="stat-label">{t('exam.questions')}</div>
              </div>
              <div className="stat-tile">
                <div className="stat-value">{fmtGrade(state.config.passGrade)}</div>
                <div className="stat-label">{t('admin.passThreshold')}</div>
              </div>
            </div>
            <div className="infobox warn">
              <div className="infobox-head" style={{ cursor: 'default' }}>
                <TriangleAlert size={18} aria-hidden />
                <span>{t('exam.away')}</span>
              </div>
              <p style={{ margin: 0 }}>
                Durante la prova le uscite dalla pagina vengono registrate e mostrate al docente. Il tempo scorre anche se chiudi la
                pagina: alla scadenza la verifica viene consegnata automaticamente.
              </p>
            </div>
            <button className="btn" type="button" onClick={start}>
              {t('exam.start')}
            </button>
          </div>
        )}
      </div>
    </AppShell>
  );
}

function padAnswers(arr: string[], n: number): string[] {
  const out = new Array(n).fill('');
  for (let i = 0; i < Math.min(arr.length, n); i++) out[i] = arr[i] ?? '';
  return out;
}
