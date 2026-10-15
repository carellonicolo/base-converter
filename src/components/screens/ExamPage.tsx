import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ClipboardCheck, LogIn, Timer, Eye, TriangleAlert, Maximize, OctagonX, MessageSquare, Hand } from 'lucide-react';
import { AppShell } from '../ui/AppShell';
import { useI18n } from '../../i18n';
import { useAuth } from '../../hooks/useAuth';
import { useConfirm } from '../ui/Confirm';
import { useToast } from '../ui/Toast';
import { useFocusMonitor } from '../../hooks/useFocusMonitor';
import { useFullscreen } from '../../hooks/useFullscreen';
import { useTeacherEvents } from '../../hooks/useTeacherEvents';
import { authFetch } from '../../lib/auth';
import { fmtClock, fmtGrade, fmtTime, fmtTimeSec } from '../../lib/format';
import { asExercise, exercisePrompt, expectedHint, moduleLabel, examTitle } from '../../lib/exerciseText';
import { MAX_FOCUS_EVENTS, type FocusEvent } from '../../../shared/exam/assignments';

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
  /** Fino a quando la si può iniziare (null = finché il docente non la chiude). */
  openUntil?: string | null;
  current: null | {
    id: string;
    startedAt: string;
    deadline: string;
    questions: Question[];
    answers: string[];
    focusEvents?: FocusEvent[];
    awayEvents?: number;
    awayMs?: number;
    fullscreenExits?: number;
  };
  /** Verifica già svolta (consegnata o interrotta): si mostra l'esito, non si ripete. */
  submitted: null | {
    state?: 'consegnata' | 'annullata' | 'in_corso';
    grade: number | null;
    correctCount: number;
    totalCount: number;
    annulledReason?: string | null;
  };
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

/** Ogni quanto si salva comunque, anche senza risposte nuove. */
const HEARTBEAT_MS = 20_000;
/** Dopo una risposta, il salvataggio parte appena lo studente si ferma. */
const SAVE_DEBOUNCE_MS = 2500;

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
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [saveFailed, setSaveFailed] = useState(false);
  const [reload, setReload] = useState(0);

  // Controllo delle distrazioni: le uscite dalla pagina una per una (quando,
  // per quanto) e le uscite dallo schermo intero. Il docente le vede in
  // diretta e sulla prova.
  const [focusEvents, setFocusEvents] = useState<FocusEvent[]>([]);
  const [awayEvents, setAwayEvents] = useState(0);
  const awayMsRef = useRef(0);
  const [fullscreenExits, setFullscreenExits] = useState(0);
  const running = !!attemptId && !outcome;

  const teacher = useTeacherEvents(running ? attemptId : null);
  const annulled = teacher.annulled;
  const active = running && !annulled;

  useFocusMonitor(active, (e) => {
    awayMsRef.current += e.durataMs;
    setAwayEvents((n) => n + 1);
    setFocusEvents((list) => (list.length >= MAX_FOCUS_EVENTS ? list : [...list, { at: e.startedAt, ms: e.durataMs }]));
  });
  const fullscreen = useFullscreen(active, () => setFullscreenExits((n) => n + 1));

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
        const cur = res.data.current;
        if (cur) {
          setAttemptId(cur.id);
          setQuestions(cur.questions);
          setDeadline(new Date(cur.deadline).getTime());
          setAnswers(padAnswers(cur.answers, cur.questions.length));
          // Dopo un ricaricamento il conteggio riparte da quello registrato.
          setFocusEvents(cur.focusEvents ?? []);
          setAwayEvents(cur.awayEvents ?? 0);
          awayMsRef.current = cur.awayMs ?? 0;
          setFullscreenExits(cur.fullscreenExits ?? 0);
        }
      } else {
        setError({ message: res.error ?? 'Errore', code: res.code });
      }
    })();
    return () => {
      alive = false;
    };
  }, [user, reload]);

  /* ---- timer ---- */
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [active]);

  /* ---- salvataggio: risposte e distrazioni, per la vista live e per un computer che si spegne ---- */
  const payloadRef = useRef({ answers, focusEvents, awayEvents, fullscreenExits });
  payloadRef.current = { answers, focusEvents, awayEvents, fullscreenExits };

  const save = useCallback(async () => {
    if (!attemptId) return;
    const p = payloadRef.current;
    const res = await authFetch<{ open: boolean; savedAt?: string }>('/api/exam/heartbeat', {
      method: 'POST',
      body: JSON.stringify({ id: attemptId, ...p, awayMs: Math.round(awayMsRef.current) }),
    });
    if (res.ok && res.data?.open) {
      setSavedAt(res.data.savedAt ?? new Date().toISOString());
      setSaveFailed(false);
    } else if (!res.ok) {
      setSaveFailed(true);
    }
  }, [attemptId]);

  useEffect(() => {
    if (!active) return;
    void save();
    const id = setInterval(() => void save(), HEARTBEAT_MS);
    return () => clearInterval(id);
  }, [active, save]);

  // Una risposta nuova, un'uscita nuova: si salva appena lo studente si ferma.
  useEffect(() => {
    if (!active) return;
    const id = setTimeout(() => void save(), SAVE_DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [active, save, answers, awayEvents, fullscreenExits]);

  const remaining = deadline ? deadline - now : 0;

  const doSubmit = useCallback(
    async (auto = false) => {
      if (!attemptId || submitting || annulled) return;
      setSubmitting(true);
      const res = await authFetch<Outcome>('/api/exam/submit', {
        method: 'POST',
        body: JSON.stringify({
          id: attemptId,
          answers,
          awayEvents,
          awayMs: Math.round(awayMsRef.current),
          focusEvents,
          fullscreenExits,
          auto,
        }),
      });
      setSubmitting(false);
      if (res.ok && res.data) {
        setOutcome(res.data);
        setAttemptId(null);
        if (auto) toast(t('exam.timeUp'), 'info');
      } else if (res.code === 'annulled' || res.code === 'already_submitted' || res.code === 'not_open' || res.code === 'no_attempt') {
        // La prova non è più in corso (interrotta, o consegnata dal server):
        // si ricarica lo stato, che dice com'è finita.
        setAttemptId(null);
        setQuestions(null);
        setReload((n) => n + 1);
      } else {
        toast(res.error ?? t('errors.network'), 'error');
      }
    },
    [attemptId, answers, awayEvents, focusEvents, fullscreenExits, submitting, annulled, t, toast]
  );

  /* ---- consegna automatica allo scadere ---- */
  useEffect(() => {
    if (active && deadline && now >= deadline) void doSubmit(true);
  }, [active, deadline, now, doSubmit]);

  const start = async () => {
    const res = await authFetch<{ id: string; questions?: Question[]; deadline?: string; config?: { durationMin: number } }>('/api/exam/start', {
      method: 'POST',
    });
    if (res.ok && res.data) {
      if (res.data.questions) {
        setAttemptId(res.data.id);
        setQuestions(res.data.questions);
        setAnswers(new Array(res.data.questions.length).fill(''));
        setDeadline(res.data.deadline ? Date.parse(res.data.deadline) : Date.now() + (res.data.config?.durationMin ?? 30) * 60_000);
        setFocusEvents([]);
        setAwayEvents(0);
        awayMsRef.current = 0;
        setFullscreenExits(0);
      } else {
        // Tentativo ripreso: ricarica lo stato completo.
        setReload((n) => n + 1);
      }
    } else {
      toast(res.error ?? t('errors.network'), 'error');
    }
  };

  const askSubmit = async () => {
    const ok = await confirm({ title: t('exam.submit'), message: t('exam.submitConfirm'), confirmLabel: t('exam.submit'), cancelLabel: t('common.cancel') });
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

  /* ---------- prova interrotta dal docente ---------- */
  if (annulled && attemptId) {
    return (
      <AppShell nav={false}>
        <div className="exam-overlay" role="alertdialog" aria-modal="true" aria-labelledby="annulled-title">
          <div className="exam-overlay-card">
            <OctagonX size={44} color="var(--error)" aria-hidden />
            <h2 id="annulled-title" style={{ margin: '0.5rem 0' }}>{t('exam.annulledTitle')}</h2>
            <p style={{ margin: '0 0 0.5rem' }}>{t('exam.annulledBody')}</p>
            {annulled.reason && (
              <div className="exam-overlay-reason">
                <strong>{t('exam.reason')}:</strong> {annulled.reason}
              </div>
            )}
            <button
              className="btn"
              type="button"
              onClick={() => {
                setAttemptId(null);
                setQuestions(null);
                setReload((n) => n + 1);
              }}
              style={{ marginTop: '0.75rem' }}
            >
              {t('common.close')}
            </button>
          </div>
        </div>
      </AppShell>
    );
  }

  /* ---------- prova in corso ---------- */
  if (attemptId && questions) {
    const danger = remaining < 60_000;
    const warning = remaining < 5 * 60_000;
    const msg = teacher.current;
    return (
      <AppShell nav={false}>
        {msg && (
          <div className="exam-overlay" role="alertdialog" aria-modal="true" aria-labelledby="teacher-msg-title">
            <div className={`exam-msg-card ${msg.type === 'ammonizione' ? 'exam-msg-warning' : 'exam-msg-alert'}`}>
              {msg.type === 'ammonizione' ? <Hand size={38} color="var(--error)" aria-hidden /> : <MessageSquare size={38} color="var(--warn-text)" aria-hidden />}
              <h2 id="teacher-msg-title" style={{ margin: '0.4rem 0' }}>
                {msg.type === 'ammonizione' ? t('exam.warningTitle') : t('exam.alertTitle')}
              </h2>
              {msg.message && <p style={{ fontSize: '1.05rem', margin: '0 0 0.4rem' }}>{msg.message}</p>}
              {msg.type === 'ammonizione' && <p className="hint">{t('exam.warningNote')}</p>}
              <button className="btn" type="button" onClick={teacher.dismiss} autoFocus style={{ marginTop: '0.6rem' }}>
                {msg.type === 'ammonizione' ? t('exam.understood') : t('common.close')}
              </button>
            </div>
          </div>
        )}
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
            <span className={`monitor-chip ${awayEvents + fullscreenExits === 0 ? 'zero' : 'warn'}`}>
              <Eye size={14} />{' '}
              {awayEvents + fullscreenExits === 0
                ? t('exam.monitorOk')
                : t('exam.monitorAway', { n: awayEvents }) + (fullscreenExits ? ` · ${t('exam.monitorFullscreen', { n: fullscreenExits })}` : '')}
            </span>
            {teacher.warnings > 0 && (
              <span className="monitor-chip warn">
                <Hand size={14} /> {t('exam.warningsCount', { n: teacher.warnings })}
              </span>
            )}
            <span className="save-state" aria-live="polite">
              {saveFailed ? t('exam.saveFailed') : savedAt ? t('exam.savedAt', { time: fmtTimeSec(savedAt) }) : ''}
            </span>
            <button className="btn btn-sm" type="button" onClick={askSubmit} disabled={submitting}>
              {submitting ? t('exam.submitting') : t('exam.submit')}
            </button>
          </div>

          {fullscreen.supported && !fullscreen.isFullscreen && (
            <div className="fullscreen-banner">
              <Maximize size={18} aria-hidden />
              <span>{fullscreenExits > 0 ? t('exam.fullscreenLeft') : t('exam.fullscreenAsk')}</span>
              <button className="btn btn-sm" type="button" onClick={fullscreen.enter}>
                {t('exam.fullscreenBack')}
              </button>
            </div>
          )}

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
                  {t(q.points === 1 ? 'exam.point' : 'exam.points', { n: q.points })}
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
        ) : state.submitted?.state === 'annullata' ? (
          <div className="card">
            <h2 style={{ marginTop: 0, fontSize: '1.05rem' }}>{t('exam.annulledTitle')}</h2>
            {examName && <span className="chip primary" style={{ marginBottom: '0.75rem' }}>{examName}</span>}
            <p className="hint">{t('exam.annulledDone')}</p>
            {state.submitted.annulledReason && (
              <p className="hint">
                <strong>{t('exam.reason')}:</strong> {state.submitted.annulledReason}
              </p>
            )}
          </div>
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
            {state.openUntil && <p className="hint" style={{ marginTop: 0 }}>{t('exam.openUntil', { time: fmtTime(state.openUntil) })}</p>}
            <div className="infobox warn">
              <div className="infobox-head" style={{ cursor: 'default' }}>
                <TriangleAlert size={18} aria-hidden />
                <span>{t('exam.rulesTitle')}</span>
              </div>
              <p style={{ margin: 0 }}>{t('exam.rulesBody')}</p>
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
