import { useCallback, useEffect, useMemo, useState } from 'react';
import { Send, Eye, RefreshCw, Plus, X, FolderOpen } from 'lucide-react';
import { useI18n } from '../../i18n';
import { useToast } from '../ui/Toast';
import { useConfirm } from '../ui/Confirm';
import { LoadState } from '../ui/LoadState';
import { teacherApi, type CatalogExam, type SessionSummary, type StudentRow } from '../../lib/teacherApi';
import { examTitle } from '../../lib/exerciseText';
import { fmtDuration, fmtTime } from '../../lib/format';
import { surnameFirst } from '../../lib/names';
import { compareText } from '../../lib/sort';
import { DEFAULT_WINDOW_MIN, WINDOW_OPTIONS_MIN } from '../../../shared/exam/assignments';
import { TOPICS } from '../../../shared/exam/catalog';
import { PreviewModal } from './CatalogTab';
import { TabHead, examLabel, fmtWindow, targetLabel, useServerNow } from './common';

const WINDOW_KEY = 'bc_admin_window';
/** 'none' = aperta finché il docente non la chiude. */
type WindowChoice = number | 'none';

function readWindow(): WindowChoice {
  try {
    const v = localStorage.getItem(WINDOW_KEY);
    if (v === 'none') return 'none';
    const n = Number(v);
    return (WINDOW_OPTIONS_MIN as readonly number[]).includes(n) ? n : DEFAULT_WINDOW_MIN;
  } catch {
    return DEFAULT_WINDOW_MIN;
  }
}

function writeWindow(w: WindowChoice): void {
  try {
    localStorage.setItem(WINDOW_KEY, String(w));
  } catch {
    /* si riparte da un'ora */
  }
}

const DURATIONS = [15, 20, 30, 40, 45, 50, 60, 90, 120];

interface Props {
  /** Verifica scelta dal Catalogo, da preselezionare. */
  preselect: string | null;
  /** Studente scelto dalla sua cartella: assegnazione personale. */
  preselectStudent: string | null;
  onOpenSession: (id: string) => void;
}

/**
 * Assegnare una verifica: a chi (una classe o un singolo studente), per
 * quanto tempo la si può iniziare, quanto dura. In cima, le verifiche aperte
 * in questo momento, con i comandi per prolungarle o chiuderle.
 */
export function AssignTab({ preselect, preselectStudent, onOpenSession }: Props) {
  const { t } = useI18n();
  const toast = useToast();
  const confirm = useConfirm();

  const [exams, setExams] = useState<CatalogExam[] | null>(null);
  const [sessions, setSessions] = useState<SessionSummary[] | null>(null);
  const [serverNow, setServerNow] = useState<string | null>(null);
  const [classes, setClasses] = useState<string[] | null>(null);
  const [students, setStudents] = useState<StudentRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const [examId, setExamId] = useState(preselect ?? '');
  const [targetType, setTargetType] = useState<'class' | 'student'>('class');
  const [cls, setCls] = useState('');
  const [studentQuery, setStudentQuery] = useState('');
  const [studentId, setStudentId] = useState('');
  const [duration, setDuration] = useState<number | ''>('');
  const [windowMin, setWindowMin] = useState<WindowChoice>(readWindow);
  const [previewId, setPreviewId] = useState<string | null>(null);

  const now = useServerNow(serverNow);

  const loadSessions = useCallback(async () => {
    const res = await teacherApi.sessions();
    if (res.ok && res.data) {
      setSessions(res.data.assignments);
      setServerNow(res.data.now);
      setError(null);
    } else {
      setError(res.error ?? `HTTP ${res.status}`);
    }
  }, []);

  useEffect(() => {
    void (async () => {
      const [c, cl, st] = await Promise.all([teacherApi.catalog(), teacherApi.classes(), teacherApi.students()]);
      if (c.ok && c.data) setExams(c.data.exams);
      else setError(c.error ?? `HTTP ${c.status}`);
      setClasses(cl.ok && cl.data ? cl.data.classes : []);
      setStudents(st.ok && st.data ? st.data.students : []);
    })();
    void loadSessions();
    const id = setInterval(() => {
      if (!document.hidden) void loadSessions();
    }, 30_000);
    return () => clearInterval(id);
  }, [loadSessions]);

  useEffect(() => {
    if (preselect) setExamId(preselect);
  }, [preselect]);

  useEffect(() => {
    if (!preselectStudent) return;
    setTargetType('student');
    setStudentId(preselectStudent);
  }, [preselectStudent]);

  useEffect(() => {
    if (!examId && exams?.length) setExamId(exams[0].id);
  }, [exams, examId]);

  const exam = exams?.find((e) => e.id === examId) ?? null;
  const open = useMemo(() => (sessions ?? []).filter((s) => s.state === 'open'), [sessions]);

  const filteredStudents = useMemo(() => {
    const q = studentQuery.trim().toLowerCase();
    return (students ?? [])
      .filter((s) => !q || s.name.toLowerCase().includes(q) || surnameFirst(s.name).toLowerCase().includes(q) || s.email.toLowerCase().includes(q) || s.classes.some((c) => c.toLowerCase() === q))
      .sort((a, b) => compareText(surnameFirst(a.name), surnameFirst(b.name)));
  }, [students, studentQuery]);

  const student = students?.find((s) => s.id === studentId) ?? null;
  // La verifica che la nuova chiuderebbe: una di classe per la classe, una
  // personale per lo studente.
  const clash = open.find((s) =>
    targetType === 'class' ? s.targetType === 'class' && s.class === cls.trim() : s.targetType === 'student' && s.studentId === studentId
  );

  const effectiveDuration = duration === '' ? exam?.durationMin ?? 30 : duration;
  const until = windowMin === 'none' ? null : new Date(now + windowMin * 60_000).toISOString();
  const targetName = targetType === 'class' ? cls.trim() : student ? surnameFirst(student.name) : '';

  const submit = async () => {
    if (!exam) return;
    if (targetType === 'class' && !cls.trim()) return toast(t('admin.chooseClass'), 'error');
    if (targetType === 'student' && !student) return toast(t('admin.chooseStudent'), 'error');
    setBusy('new');
    const res = await teacherApi.assign({
      examId: exam.id,
      targetType,
      class: targetType === 'class' ? cls.trim() : undefined,
      studentId: student?.id,
      studentName: student?.name,
      studentClass: student?.classes[0],
      durationMin: duration === '' ? null : duration,
      openForMin: windowMin === 'none' ? null : windowMin,
    });
    setBusy(null);
    if (res.ok && res.data) {
      writeWindow(windowMin);
      toast(t('admin.assignedOk', { target: targetName }), 'success');
      if (res.data.closedPrevious > 0) toast(t('admin.closedPrevious', { target: targetName }), 'info');
      void loadSessions();
    } else {
      toast(res.error ?? t('errors.network'), 'error');
    }
  };

  const extend = async (s: SessionSummary) => {
    setBusy(s.id);
    const res = await teacherApi.extendSession(s.id, 15);
    setBusy(null);
    if (res.ok) {
      toast(t('admin.extendedOk', { target: targetLabel(s) }), 'success');
      void loadSessions();
    } else toast(res.error ?? t('errors.network'), 'error');
  };

  const close = async (s: SessionSummary) => {
    const ok = await confirm({
      title: t('admin.closeTitle', { target: targetLabel(s) }),
      message: s.live > 0 ? t('admin.closeBodyLive', { n: s.live }) : t('admin.closeBody'),
      confirmLabel: t('admin.closeNow'),
      cancelLabel: t('common.cancel'),
      danger: true,
    });
    if (!ok) return;
    setBusy(s.id);
    const res = await teacherApi.closeSession(s.id);
    setBusy(null);
    if (res.ok) {
      toast(t('admin.closedOk', { target: targetLabel(s) }), 'success');
      void loadSessions();
    } else toast(res.error ?? t('errors.network'), 'error');
  };

  if (error && !exams) {
    return (
      <div className="card">
        <LoadState t={t} error={error} onRetry={() => window.location.reload()} />
      </div>
    );
  }

  return (
    <>
      <TabHead
        title={t('admin.assignTitle')}
        lead={t('admin.assignLead')}
        actions={
          <button className="btn btn-sm btn-ghost" type="button" onClick={() => void loadSessions()}>
            <RefreshCw size={14} /> {t('admin.refresh')}
          </button>
        }
      />

      {open.length > 0 && (
        <div className="card open-now">
          <h3 className="section-h" style={{ marginTop: 0 }}>
            <span className="sidebar-dot" aria-hidden style={{ marginLeft: 0 }} /> {t('admin.openNow')}
          </h3>
          {open.map((s) => (
            <div key={s.id} className="open-row">
              <div className="open-row-target">{s.targetType === 'class' ? s.class : '👤'}</div>
              <div className="open-row-text">
                <div>
                  {s.targetType === 'student' && <strong>{targetLabel(s)} · </strong>}
                  <strong>{examLabel(s.exam, s.examId, t)}</strong> · {s.durationMin ?? '—'} min
                  {s.reopenedAt && <span className="chip chip-mini" style={{ marginLeft: 6 }}>{t('admin.recovery')}</span>}
                </div>
                <div className="hint">
                  {s.openUntil
                    ? t('admin.openUntil', { time: fmtTime(s.openUntil), left: fmtDuration(Date.parse(s.openUntil) - now) })
                    : t('admin.openNoLimit')}
                  {' · '}
                  {s.enrolled !== null && s.targetType === 'class'
                    ? t('admin.liveSubmittedOf', { live: s.live, submitted: s.submitted, enrolled: s.enrolled })
                    : t('admin.liveSubmitted', { live: s.live, submitted: s.submitted })}
                </div>
              </div>
              <div className="open-row-actions">
                {s.openUntil && (
                  <button className="btn btn-sm btn-ghost" type="button" disabled={busy === s.id} onClick={() => void extend(s)}>
                    <Plus size={14} /> 15 min
                  </button>
                )}
                <button className="btn btn-sm btn-ghost" type="button" onClick={() => onOpenSession(s.id)}>
                  <FolderOpen size={14} /> {t('admin.openSession')}
                </button>
                <button className="btn btn-sm btn-ghost danger-text" type="button" disabled={busy === s.id} onClick={() => void close(s)}>
                  <X size={14} /> {t('admin.closeNow')}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="card">
        <h3 className="section-h" style={{ marginTop: 0 }}>{t('admin.newAssignment')}</h3>
        {!exams ? (
          <p>{t('common.loading')}</p>
        ) : (
          <form
            className="assign-form"
            onSubmit={(e) => {
              e.preventDefault();
              void submit();
            }}
          >
            <div className="assign-step">
              <div className="step-label">1 · {t('admin.stepExam')}</div>
              <div className="row row-wrap" style={{ gap: '0.5rem' }}>
                <select value={examId} onChange={(e) => setExamId(e.target.value)} aria-label={t('admin.stepExam')} style={{ flex: 1, minWidth: 240 }}>
                  {TOPICS.map((topic) => (
                    <optgroup key={topic} label={t(`topic.${topic}`)}>
                      {exams
                        .filter((e) => e.topic === topic)
                        .sort((a, b) => a.level - b.level)
                        .map((e) => (
                          <option key={e.id} value={e.id}>
                            {examTitle(e.topic, e.level, t)} · {e.questionCount} {t('admin.questionsShort')} · {e.durationMin} min
                          </option>
                        ))}
                    </optgroup>
                  ))}
                </select>
                <button className="btn btn-sm btn-ghost" type="button" onClick={() => setPreviewId(examId)} disabled={!examId}>
                  <Eye size={14} /> {t('admin.preview')}
                </button>
              </div>
            </div>

            <div className="assign-step">
              <div className="step-label">2 · {t('admin.stepTarget')}</div>
              <div className="segmented" role="radiogroup" aria-label={t('admin.stepTarget')} style={{ marginBottom: '0.6rem' }}>
                <button type="button" role="radio" aria-checked={targetType === 'class'} className={targetType === 'class' ? 'active' : ''} onClick={() => setTargetType('class')}>
                  {t('admin.targetClass')}
                </button>
                <button type="button" role="radio" aria-checked={targetType === 'student'} className={targetType === 'student' ? 'active' : ''} onClick={() => setTargetType('student')}>
                  {t('admin.targetStudent')}
                </button>
              </div>
              {targetType === 'class' ? (
                classes === null ? (
                  <p className="hint">{t('admin.classesLoading')}</p>
                ) : classes.length > 0 ? (
                  <div className="class-chips" role="radiogroup" aria-label={t('admin.chooseClass')}>
                    {classes.map((c) => (
                      <button key={c} type="button" role="radio" aria-checked={cls === c} className={`chip-btn${cls === c ? ' active' : ''}`} onClick={() => setCls(c)}>
                        {c}
                      </button>
                    ))}
                  </div>
                ) : (
                  <>
                    <p className="hint" style={{ marginTop: 0 }}>{t('admin.noClasses')}</p>
                    <input value={cls} onChange={(e) => setCls(e.target.value)} placeholder={t('admin.classPlaceholder')} aria-label={t('admin.chooseClass')} style={{ maxWidth: 220 }} />
                  </>
                )
              ) : (
                <div className="stack" style={{ gap: '0.4rem' }}>
                  <input value={studentQuery} onChange={(e) => setStudentQuery(e.target.value)} placeholder={t('admin.searchStudent')} aria-label={t('admin.searchStudent')} />
                  <select value={studentId} onChange={(e) => setStudentId(e.target.value)} size={Math.min(8, Math.max(3, filteredStudents.length))} aria-label={t('admin.chooseStudent')}>
                    {filteredStudents.map((s) => (
                      <option key={s.id} value={s.id}>
                        {surnameFirst(s.name)} {s.classes.length ? `(${s.classes.join(', ')})` : ''} · {s.email}
                      </option>
                    ))}
                  </select>
                  <span className="hint">{t('admin.studentHint')}</span>
                </div>
              )}
            </div>

            <div className="field-row">
              <div className="assign-step">
                <div className="step-label">3 · {t('admin.stepDuration')}</div>
                <select value={duration} onChange={(e) => setDuration(e.target.value === '' ? '' : Number(e.target.value))} aria-label={t('admin.stepDuration')}>
                  <option value="">{t('admin.durationDefault', { n: exam?.durationMin ?? 30 })}</option>
                  {DURATIONS.map((m) => (
                    <option key={m} value={m}>
                      {m} min
                    </option>
                  ))}
                </select>
              </div>
              <div className="assign-step">
                <div className="step-label">4 · {t('admin.stepWindow')}</div>
                <select value={String(windowMin)} onChange={(e) => setWindowMin(e.target.value === 'none' ? 'none' : Number(e.target.value))} aria-label={t('admin.stepWindow')}>
                  {WINDOW_OPTIONS_MIN.map((m) => (
                    <option key={m} value={m}>
                      {fmtWindow(m)}
                    </option>
                  ))}
                  <option value="none">{t('admin.windowNone')}</option>
                </select>
              </div>
            </div>

            <div className="assign-summary">
              {exam && targetName ? (
                <>
                  {until
                    ? t('admin.summaryWindow', { exam: examLabel(exam, exam.id, t), target: targetName, time: fmtTime(until), n: effectiveDuration })
                    : t('admin.summaryNoWindow', { exam: examLabel(exam, exam.id, t), target: targetName, n: effectiveDuration })}
                  {clash && <div className="warn-text" style={{ marginTop: 4 }}>⚠ {t('admin.summaryClash', { exam: examLabel(clash.exam, clash.examId, t) })}</div>}
                </>
              ) : (
                <span className="hint">{t('admin.summaryEmpty')}</span>
              )}
            </div>

            <div>
              <button className="btn" type="submit" disabled={busy === 'new' || !exam || !targetName}>
                <Send size={16} /> {busy === 'new' ? t('common.loading') : t('admin.assignSubmit')}
              </button>
            </div>
          </form>
        )}
      </div>

      {previewId && <PreviewModal examId={previewId} onClose={() => setPreviewId(null)} />}
    </>
  );
}

