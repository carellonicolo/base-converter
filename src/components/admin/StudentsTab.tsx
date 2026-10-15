import { useCallback, useEffect, useMemo, useState } from 'react';
import { Users, RefreshCw, ArrowLeft, Download, Send } from 'lucide-react';
import { useI18n } from '../../i18n';
import { Modal } from '../ui/Modal';
import { LoadState } from '../ui/LoadState';
import { ThSort } from '../ui/ThSort';
import { useSort, type SortColumn } from '../../hooks/useSort';
import { teacherApi, type StudentDetail, type StudentRow } from '../../lib/teacherApi';
import { coerceProgress, levelFromXp } from '../../lib/progress';
import { fmtDate, fmtDateTime, fmtGrade, gradeColor } from '../../lib/format';
import { surnameFirst } from '../../lib/names';
import { compareText, instant } from '../../lib/sort';
import { buildCsv, downloadCsv, safeFileName } from '../../lib/csv';
import { AttemptModal } from './AttemptModal';
import { GymDetail } from './LeaderboardTab';
import {
  AttemptStateChip,
  ClassPicker,
  DistractionCell,
  GradeCell,
  NO_CLASS,
  StatTiles,
  TabHead,
  classLabel,
  examLabel,
  groupByClass,
  useRememberedClass,
  type Tfn,
} from './common';

type Col = 'student' | 'email' | 'exams' | 'avg' | 'lastExam' | 'xp' | 'login';

function columns(t: Tfn): SortColumn<StudentRow, Col>[] {
  return [
    { key: 'student', label: t('admin.csvName'), value: (s) => surnameFirst(s.name) },
    { key: 'email', label: 'Email', value: (s) => s.email },
    { key: 'exams', label: t('admin.examsCol'), dir: 'desc', value: (s) => s.submitted },
    { key: 'avg', label: t('admin.average'), dir: 'desc', value: (s) => s.avgGrade },
    { key: 'lastExam', label: t('admin.lastExam'), dir: 'desc', value: (s) => instant(s.lastExamAt) },
    { key: 'xp', label: 'XP', dir: 'desc', value: (s) => s.xp },
    { key: 'login', label: t('admin.lastLogin'), dir: 'desc', value: (s) => instant(s.lastLoginAt) },
  ];
}

const byName = (a: StudentRow, b: StudentRow) => compareText(surnameFirst(a.name), surnameFirst(b.name));

/**
 * Gli studenti, per classe, come sono nel registro dell'IdP: anche chi non ha
 * mai aperto l'app. Un clic apre la cartella dello studente: tutte le sue
 * verifiche e la palestra. Gli account si gestiscono su auth.nicolocarello.it.
 */
export function StudentsTab({ onAssignTo }: { onAssignTo: (studentId: string) => void }) {
  const { t } = useI18n();
  const [rows, setRows] = useState<StudentRow[] | null>(null);
  const [source, setSource] = useState('auth');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [cls, setCls] = useRememberedClass();
  const [query, setQuery] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await teacherApi.students();
    setLoading(false);
    if (res.ok && res.data) {
      setRows(res.data.students);
      setSource(res.data.source);
      setError(null);
    } else setError(res.error ?? `HTTP ${res.status}`);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const groups = useMemo(() => groupByClass(rows ?? []), [rows]);
  const openCls = rows && cls !== null && groups.some((g) => g.name === cls) ? cls : null;

  const visible = useMemo(() => {
    if (!rows || openCls === null) return [];
    const q = query.trim().toLowerCase();
    return rows
      .filter((s) => (openCls === NO_CLASS ? s.classes.length === 0 : s.classes.includes(openCls)))
      .filter((s) => !q || s.name.toLowerCase().includes(q) || surnameFirst(s.name).toLowerCase().includes(q) || s.email.toLowerCase().includes(q));
  }, [rows, openCls, query]);

  const cols = useMemo(() => columns(t), [t]);
  const { sorted, header } = useSort(visible, cols, { column: 'student', dir: 'asc' }, byName);

  const exportCsv = () => {
    if (openCls === null) return;
    const head = [t('admin.csvName'), 'Email', t('admin.classLabel'), t('admin.examsCol'), t('admin.average'), t('admin.annulledCount'), t('admin.lastExam'), 'XP', t('gym.level'), t('admin.lastLogin')];
    const data = sorted.map((s) => [
      surnameFirst(s.name), s.email, s.classes.join(', '), s.submitted, s.avgGrade, s.annulled, s.lastExamAt ? fmtDate(s.lastExamAt) : '',
      s.xp ?? 0, levelFromXp(s.xp ?? 0), s.lastLoginAt ? fmtDate(s.lastLoginAt) : '',
    ]);
    downloadCsv(`studenti_${safeFileName(classLabel(openCls, t))}_${new Date().toLocaleDateString('sv-SE')}.csv`, buildCsv(head, data));
  };

  return (
    <>
      <TabHead
        title={
          <span className="row" style={{ display: 'inline-flex' }}>
            <Users size={20} color="var(--primary)" />
            {openCls === null ? (
              t('admin.studentsTitle')
            ) : (
              <>
                <button type="button" className="link-button" onClick={() => setCls(null)}>
                  {t('admin.studentsTitle')}
                </button>
                <span aria-hidden>›</span> {classLabel(openCls, t)}
              </>
            )}
          </span>
        }
        lead={openCls === null ? t('admin.studentsLead') : t('admin.studentsLeadClass')}
        actions={
          <>
            {openCls !== null && (
              <>
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('admin.searchStudent')} aria-label={t('admin.searchStudent')} style={{ width: 200 }} />
                <button className="btn btn-sm btn-ghost" type="button" onClick={exportCsv} disabled={sorted.length === 0}>
                  <Download size={14} /> CSV
                </button>
                <button className="btn btn-sm btn-ghost" type="button" onClick={() => setCls(null)}>
                  <ArrowLeft size={14} /> {t('admin.classes')}
                </button>
              </>
            )}
            <button className="btn btn-sm btn-ghost" type="button" onClick={() => void load()} disabled={loading}>
              <RefreshCw size={14} /> {t('admin.refresh')}
            </button>
          </>
        }
      >
        {source !== 'auth' && rows && <p className="warn-text" style={{ marginBottom: 0 }}>⚠ {t('admin.rosterDown')}</p>}
      </TabHead>

      {!rows ? (
        <div className="card">
          <LoadState t={t} error={error} onRetry={() => void load()} />
        </div>
      ) : openCls === null ? (
        groups.length === 0 ? (
          <div className="card hint">{t('admin.studentsEmpty')}</div>
        ) : (
          <ClassPicker groups={groups} onPick={(c) => { setCls(c); setQuery(''); }} />
        )
      ) : (
        <div className="card">
          {sorted.length === 0 ? (
            <p className="hint" style={{ margin: 0 }}>{t('admin.noResultsFiltered')}</p>
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
                  {sorted.map((s) => (
                    <tr
                      key={s.id}
                      className="row-link"
                      tabIndex={0}
                      role="button"
                      aria-label={t('admin.folderOf', { name: surnameFirst(s.name) })}
                      onClick={() => setOpenId(s.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setOpenId(s.id);
                        }
                      }}
                    >
                      <td>
                        <strong>{surnameFirst(s.name)}</strong>
                        {s.status !== 'active' && <span className="chip chip-ko chip-mini" style={{ marginLeft: 6 }}>{t('admin.suspended')}</span>}
                      </td>
                      <td className="hint">{s.email}</td>
                      <td className="mono">
                        {s.submitted}
                        {s.annulled > 0 && <span className="error-text"> +{s.annulled}⛔</span>}
                        {s.live > 0 && <span className="warn-text"> ●</span>}
                      </td>
                      <td>
                        <strong className="mono" style={{ color: s.avgGrade !== null ? gradeColor(s.avgGrade) : undefined }}>
                          {fmtGrade(s.avgGrade)}
                        </strong>
                      </td>
                      <td style={{ whiteSpace: 'nowrap' }}>{s.lastExamAt ? fmtDate(s.lastExamAt) : '—'}</td>
                      <td className="mono">{s.xp !== null ? `${s.xp} · L${levelFromXp(s.xp)}` : '—'}</td>
                      <td style={{ whiteSpace: 'nowrap' }}>{s.lastLoginAt ? fmtDate(s.lastLoginAt) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {openId && (
        <StudentModal
          id={openId}
          onClose={() => setOpenId(null)}
          onAssign={() => {
            const id = openId;
            setOpenId(null);
            onAssignTo(id);
          }}
          onChanged={() => void load()}
        />
      )}
    </>
  );
}

/** La cartella di uno studente: le verifiche (tutte, anche interrotte) e la palestra. */
function StudentModal({ id, onClose, onAssign, onChanged }: { id: string; onClose: () => void; onAssign: () => void; onChanged: () => void }) {
  const { t } = useI18n();
  const [data, setData] = useState<StudentDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attemptId, setAttemptId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await teacherApi.student(id);
    if (res.ok && res.data) {
      setData(res.data);
      setError(null);
    } else setError(res.error ?? `HTTP ${res.status}`);
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const progress = data?.progress ? coerceProgress(data.progress) : null;
  const done = (data?.attempts ?? []).filter((a) => a.state === 'consegnata' && a.grade !== null);
  const mean = done.length ? done.reduce((s, a) => s + (a.grade ?? 0), 0) / done.length : null;

  return (
    <>
      <Modal title={data ? surnameFirst(data.student.name) : t('common.loading')} onClose={onClose} className="modal-wide">
        {!data || error ? (
          <LoadState t={t} error={error} onRetry={() => void load()} />
        ) : (
          <>
            <div className="row row-wrap" style={{ justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <span className="hint">
                {data.student.email}
                {data.student.classes.length ? ` · ${data.student.classes.join(', ')}` : ''}
                {data.student.lastLoginAt ? ` · ${t('admin.lastLogin')} ${fmtDateTime(data.student.lastLoginAt)}` : ''}
              </span>
              <button className="btn btn-sm" type="button" onClick={onAssign}>
                <Send size={14} /> {t('admin.assignPersonal')}
              </button>
            </div>
            <StatTiles
              tiles={[
                { label: t('admin.examsCol'), value: String(done.length) },
                { label: t('admin.average'), value: fmtGrade(mean === null ? null : Math.round(mean * 100) / 100), tone: 'good' },
                { label: t('admin.annulledCount'), value: String(data.attempts.filter((a) => a.state === 'annullata').length) },
                { label: 'XP', value: progress ? progress.xp.toLocaleString('it-IT') : '—' },
              ]}
            />
            <h3 className="section-h">{t('admin.examsCol')}</h3>
            {data.attempts.length === 0 ? (
              <p className="hint">{t('admin.noExamsStudent')}</p>
            ) : (
              <div className="table-wrap">
                <table className="result-table" style={{ marginBottom: 0 }}>
                  <thead>
                    <tr>
                      <th>{t('admin.date')}</th>
                      <th>{t('admin.exam')}</th>
                      <th>{t('admin.stateCol')}</th>
                      <th>{t('admin.grade')}</th>
                      <th>{t('admin.correct')}</th>
                      <th>{t('admin.distractions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.attempts.map((a) => (
                      <tr key={a.id} className="row-link" tabIndex={0} role="button" onClick={() => setAttemptId(a.id)} onKeyDown={(e) => e.key === 'Enter' && setAttemptId(a.id)}>
                        <td style={{ whiteSpace: 'nowrap' }}>{fmtDateTime(a.submittedAt ?? a.startedAt)}</td>
                        <td>{examLabel(a.exam, a.examId, t)}</td>
                        <td>
                          <AttemptStateChip a={a} />
                        </td>
                        <td>
                          <GradeCell a={a} />
                        </td>
                        <td className="mono">
                          {a.correctCount}/{a.totalCount}
                        </td>
                        <td>
                          <DistractionCell a={a} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <h3 className="section-h">{t('admin.gymTitle')}</h3>
            {progress ? (
              <GymDetail
                contact={false}
                row={{ email: data.student.email, classes: data.student.classes, progress, level: levelFromXp(progress.xp), xp: progress.xp, updatedAt: data.progressAt }}
              />
            ) : (
              <p className="hint">{t('admin.noGym')}</p>
            )}
          </>
        )}
      </Modal>
      {attemptId && (
        <AttemptModal
          attemptId={attemptId}
          onClose={() => setAttemptId(null)}
          onDeleted={() => {
            void load();
            onChanged();
          }}
        />
      )}
    </>
  );
}
