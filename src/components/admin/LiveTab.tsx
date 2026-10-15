import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Radio, MessageSquare, Hand, OctagonX } from 'lucide-react';
import { useI18n } from '../../i18n';
import { Modal } from '../ui/Modal';
import { useToast } from '../ui/Toast';
import { LoadState } from '../ui/LoadState';
import { ThSort } from '../ui/ThSort';
import { useSort, type SortColumn } from '../../hooks/useSort';
import { teacherApi, type LiveAttempt, type TeacherEvent } from '../../lib/teacherApi';
import { fmtClock, fmtDuration } from '../../lib/format';
import { surnameFirst } from '../../lib/names';
import { compareText, instant } from '../../lib/sort';
import { AttemptModal } from './AttemptModal';
import { DistractionCell, TabHead, examLabel, useServerNow, type Tfn } from './common';

const REFRESH_MS = 5000;
/** Oltre questi silenzi il browser dello studente non sta più mandando segnali. */
const IDLE_MS = 50_000;
const OFFLINE_MS = 3 * 60_000;

type Col = 'student' | 'class' | 'exam' | 'progress' | 'time' | 'signal' | 'distractions';

function columns(t: Tfn, now: () => number): SortColumn<LiveAttempt, Col>[] {
  return [
    { key: 'student', label: t('admin.student'), value: (r) => surnameFirst(r.name) },
    { key: 'class', label: t('admin.classLabel'), value: (r) => r.class },
    { key: 'exam', label: t('admin.exam'), value: (r) => r.examId },
    { key: 'progress', label: t('admin.progress'), dir: 'desc', value: (r) => (r.total ? r.answered / r.total : 0) },
    { key: 'time', label: t('admin.timeLeft'), value: (r) => instant(r.deadlineAt) },
    { key: 'signal', label: t('admin.lastSignal'), value: (r) => now() - (instant(r.lastSeenAt) ?? 0) },
    { key: 'distractions', label: t('admin.distractions'), dir: 'desc', value: (r) => r.awayEvents + r.fullscreenExits + r.warnings * 10 },
  ];
}

const byName = (a: LiveAttempt, b: LiveAttempt) => compareText(surnameFirst(a.name), surnameFirst(b.name));

/**
 * Le prove in corso, aggiornate ogni pochi secondi: avanzamento, tempo
 * residuo, ultimo segnale del browser, distrazioni. Da qui il docente manda
 * un avviso, registra un'ammonizione o interrompe la prova.
 */
export function LiveTab({ onCount }: { onCount: (n: number) => void }) {
  const { t } = useI18n();
  const [rows, setRows] = useState<LiveAttempt[] | null>(null);
  const [serverNow, setServerNow] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [act, setAct] = useState<{ row: LiveAttempt; type: TeacherEvent['type'] } | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [cls, setCls] = useState('');
  const busyRef = useRef(false);
  const now = useServerNow(serverNow, 1000);
  const nowRef = useRef(now);
  nowRef.current = now;

  const load = useCallback(async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    const res = await teacherApi.live();
    busyRef.current = false;
    if (res.ok && res.data) {
      setRows(res.data.live);
      setServerNow(res.data.now);
      setError(null);
      onCount(res.data.live.length);
    } else {
      setError(res.error ?? `HTTP ${res.status}`);
    }
  }, [onCount]);

  useEffect(() => {
    void load();
    const id = setInterval(() => {
      if (!document.hidden) void load();
    }, REFRESH_MS);
    return () => clearInterval(id);
  }, [load]);

  const cols = useMemo(() => columns(t, () => nowRef.current), [t]);
  const classes = useMemo(() => [...new Set((rows ?? []).map((r) => r.class ?? ''))].filter(Boolean).sort(compareText), [rows]);
  const visible = useMemo(() => (rows ?? []).filter((r) => !cls || r.class === cls), [rows, cls]);
  const { sorted, header } = useSort(visible, cols, { column: 'student', dir: 'asc' }, byName);

  return (
    <>
      <TabHead
        title={
          <span className="row" style={{ display: 'inline-flex' }}>
            <Radio size={20} color="var(--primary)" /> {t('admin.liveTitle')}
          </span>
        }
        lead={t('admin.liveLead', { s: REFRESH_MS / 1000 })}
        actions={
          classes.length > 1 ? (
            <select value={cls} onChange={(e) => setCls(e.target.value)} aria-label={t('admin.classLabel')} style={{ width: 'auto' }}>
              <option value="">{t('admin.allClasses')}</option>
              {classes.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          ) : undefined
        }
      >
        {rows && error && (
          <p className="error-msg">
            {t('errors.loadFailed')} — {error}
          </p>
        )}
      </TabHead>

      {!rows ? (
        <div className="card">
          <LoadState t={t} error={error} onRetry={() => void load()} />
        </div>
      ) : sorted.length === 0 ? (
        <div className="card hint" style={{ textAlign: 'center' }}>
          {t('admin.liveEmpty')}
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
                  <th>{t('admin.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((r) => {
                  const left = Date.parse(r.deadlineAt) - now;
                  const silent = now - Date.parse(r.lastSeenAt);
                  const signal = silent <= IDLE_MS ? 'ok' : silent <= OFFLINE_MS ? 'idle' : 'off';
                  const pct = r.total ? Math.round((r.answered / r.total) * 100) : 0;
                  return (
                    <tr key={r.id} className="row-link" tabIndex={0} onClick={() => setOpenId(r.id)} onKeyDown={(e) => e.key === 'Enter' && setOpenId(r.id)}>
                      <td>
                        <strong>{surnameFirst(r.name)}</strong>
                        <div className="hint" style={{ fontSize: '0.75rem' }}>{r.email}</div>
                      </td>
                      <td>{r.class ?? '—'}</td>
                      <td>{examLabel(r.exam, r.examId, t)}</td>
                      <td>
                        <span className="mini-progress" title={`${pct}%`}>
                          <span className="mini-progress-track">
                            <span className="mini-progress-fill" style={{ width: `${pct}%` }} />
                          </span>
                          <span className="mono">
                            {r.answered}/{r.total}
                          </span>
                        </span>
                      </td>
                      <td className="mono" style={{ color: left < 60_000 ? 'var(--error)' : left < 5 * 60_000 ? 'var(--warn-text)' : undefined, fontWeight: left < 5 * 60_000 ? 700 : undefined }}>
                        {left > 0 ? fmtClock(left) : t('admin.expiredShort')}
                      </td>
                      <td>
                        <span className={`signal signal-${signal}`}>
                          {signal === 'ok' ? t('admin.signalOk') : signal === 'idle' ? t('admin.signalIdle', { time: fmtDuration(silent) }) : t('admin.signalOff', { time: fmtDuration(silent) })}
                        </span>
                      </td>
                      <td>
                        <DistractionCell a={r} />
                      </td>
                      <td onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
                        <div className="row" style={{ gap: '0.3rem', flexWrap: 'nowrap' }}>
                          <button className="icon-btn" type="button" title={t('admin.ev_alert')} aria-label={t('admin.ev_alert')} onClick={() => setAct({ row: r, type: 'alert' })}>
                            <MessageSquare size={15} />
                          </button>
                          <button className="icon-btn" type="button" title={t('admin.ev_ammonizione')} aria-label={t('admin.ev_ammonizione')} onClick={() => setAct({ row: r, type: 'ammonizione' })}>
                            <Hand size={15} />
                          </button>
                          <button className="icon-btn danger-text" type="button" title={t('admin.ev_annulla')} aria-label={t('admin.ev_annulla')} onClick={() => setAct({ row: r, type: 'annulla' })}>
                            <OctagonX size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="hint" style={{ marginBottom: 0 }}>{t('admin.liveLegend')}</p>
        </div>
      )}

      {act && <InterveneModal row={act.row} type={act.type} onClose={() => setAct(null)} onDone={() => void load()} />}
      {openId && <AttemptModal attemptId={openId} onClose={() => setOpenId(null)} onDeleted={() => void load()} />}
    </>
  );
}

/** Il messaggio di un intervento: obbligatorio per l'avviso, facoltativo altrimenti. */
function InterveneModal({ row, type, onClose, onDone }: { row: LiveAttempt; type: TeacherEvent['type']; onClose: () => void; onDone: () => void }) {
  const { t } = useI18n();
  const toast = useToast();
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const name = surnameFirst(row.name);

  const send = async () => {
    if (type === 'alert' && !message.trim()) return toast(t('admin.alertEmpty'), 'error');
    setBusy(true);
    const res = await teacherApi.intervene(row.id, type, message.trim());
    setBusy(false);
    if (res.ok) {
      toast(t(`admin.evSent_${type}`, { name }), 'success');
      onDone();
      onClose();
    } else {
      toast(res.error ?? t('errors.network'), 'error');
    }
  };

  return (
    <Modal title={t(`admin.evTitle_${type}`, { name })} onClose={onClose} size="sm">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
      >
        <p className="hint" style={{ marginTop: 0 }}>
          {t(`admin.evHelp_${type}`)}
        </p>
        <div className="field">
          <label htmlFor="intervene-msg">{type === 'alert' ? t('admin.evMessage') : t('admin.evReason')}</label>
          <textarea id="intervene-msg" rows={3} value={message} onChange={(e) => setMessage(e.target.value)} maxLength={500} autoFocus />
        </div>
        <div className="actions">
          <button className={`btn${type === 'annulla' ? ' btn-danger' : ''}`} type="submit" disabled={busy}>
            {busy ? t('common.loading') : t(`admin.evSubmit_${type}`)}
          </button>
          <button className="btn btn-secondary" type="button" onClick={onClose} style={{ marginLeft: 'auto' }}>
            {t('common.cancel')}
          </button>
        </div>
      </form>
    </Modal>
  );
}
